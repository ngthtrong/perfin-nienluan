import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { api } from '../services/api.service';
import { useTheme } from '../theme/ThemeContext';
import AppIcon from './AppIcon';

const URI_KEYS = [
  'imageUri', 'image_uri', 'imageUrl', 'image_url',
  'localUri', 'local_uri', 'previewUri', 'preview_uri',
  'thumbnailUri', 'thumbnail_uri', 'thumbnailUrl', 'thumbnail_url',
  'uri', 'url', 'src',
];
const DATA_URI_KEYS = ['dataUri', 'data_uri', 'dataUrl', 'data_url'];
const BASE64_KEYS = ['base64', 'imageBase64', 'image_base64'];

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function firstString(objects, keys) {
  for (const object of objects) {
    if (!isObject(object)) continue;
    for (const key of keys) {
      if (typeof object[key] === 'string' && object[key].trim()) return object[key].trim();
    }
  }
  return null;
}

function getMimeType(objects) {
  const value = firstString(objects, ['mimeType', 'mime_type', 'contentType', 'content_type']);
  return value && /^image\/[a-z0-9.+-]+$/i.test(value) ? value.toLowerCase() : 'image/jpeg';
}

function asDataUri(value, mimeType) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(trimmed)) return trimmed;

  const compact = trimmed.replace(/\s+/g, '');
  if (compact.length < 16 || !/^[a-z0-9+/]+={0,2}$/i.test(compact)) return null;
  return `data:${mimeType};base64,${compact}`;
}

function resolveImageUri(value, mimeType) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (/^data:/i.test(trimmed) && !/^data:image\//i.test(trimmed)) return null;
  return asDataUri(trimmed.length >= 64 ? trimmed : null, mimeType) || api.resolveMediaUri(trimmed);
}

function getDimension(objects, keys) {
  for (const object of objects) {
    if (!isObject(object)) continue;
    for (const key of keys) {
      const value = Number(object[key]);
      if (Number.isFinite(value) && value > 0) return value;
    }
  }
  return null;
}

export function resolveChatImage(message) {
  const nested = [
    message?.image, message?.media, message?.attachment, message?.asset, message?.file,
    message?.metadata?.image, message?.metadata?.media, message?.metadata?.attachment,
  ]
    .filter(isObject);
  const objects = [message, ...nested, message?.metadata].filter(isObject);
  const directImage = typeof message?.image === 'string' ? message.image : null;
  const sourceValue = objects
    .map((object) => object.source)
    .find((source) => isObject(source) && typeof source.uri === 'string');
  const sourceUri = sourceValue?.uri;
  const uriValue = directImage || firstString(objects, URI_KEYS) || sourceUri || firstString(objects, DATA_URI_KEYS);
  const mimeType = getMimeType(objects);
  const rawBase64 = firstString(objects, BASE64_KEYS)
    || firstString(objects, ['data']);
  const uri = resolveImageUri(uriValue, mimeType) || asDataUri(rawBase64, mimeType);

  if (!uri) return null;
  return {
    uri,
    mimeType,
    fileName: firstString(objects, ['fileName', 'file_name', 'name']),
    width: getDimension(objects, ['width', 'imageWidth', 'image_width']),
    height: getDimension(objects, ['height', 'imageHeight', 'image_height']),
  };
}

function previewAspectRatio(image) {
  const ratio = image?.width && image?.height ? image.width / image.height : 4 / 3;
  if (!Number.isFinite(ratio) || ratio <= 0) return 4 / 3;
  return Math.min(1.6, Math.max(0.78, ratio));
}

function mediaStatus(message) {
  const value = message?.mediaStatus || message?.media_status || message?.uploadStatus || message?.upload_status;
  if (value === 'analyzing' || value === 'uploading') return 'analyzing';
  if (value === 'analyzed' || value === 'processed' || value === 'complete') return 'analyzed';
  if (value === 'failed' || value === 'error') return 'failed';
  return null;
}

export default function ChatImagePreview({ message, isUser = true }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const image = useMemo(() => resolveChatImage(message), [message]);
  const [loadState, setLoadState] = useState(image ? 'loading' : 'missing');
  const status = mediaStatus(message);
  const foreground = isUser ? theme.colors.onBrand : theme.colors.text;
  // react-native-web reloads Image whenever a load callback identity changes.
  // Stable callbacks prevent a ready -> re-render -> onLoadStart loop for blob URIs.
  const handleLoadStart = useCallback(() => setLoadState('loading'), []);
  const handleLoad = useCallback(() => setLoadState('ready'), []);
  const handleError = useCallback(() => setLoadState('error'), []);
  const handleLoadEnd = useCallback(() => {
    setLoadState((current) => (current === 'error' ? current : 'ready'));
  }, []);

  useEffect(() => {
    setLoadState(image ? 'loading' : 'missing');
  }, [image?.uri]);

  const statusLabel = status === 'analyzing'
    ? 'Đang gửi và phân tích ảnh'
    : status === 'analyzed'
      ? 'Đã phân tích ảnh'
      : status === 'failed'
        ? 'Chưa phân tích được ảnh'
        : null;

  return (
    <View style={styles.container}>
      <View style={[styles.imageFrame, { aspectRatio: previewAspectRatio(image) }]}>
        {image && loadState !== 'error' && (
          <Image
            source={{ uri: image.uri }}
            style={[styles.image, loadState !== 'ready' && styles.imageHidden]}
            resizeMode="contain"
            resizeMethod="resize"
            accessibilityLabel={image.fileName ? `Ảnh hóa đơn ${image.fileName}` : 'Ảnh hóa đơn người dùng đã gửi'}
            onLoadStart={handleLoadStart}
            onLoad={handleLoad}
            onError={handleError}
            onLoadEnd={handleLoadEnd}
          />
        )}

        {loadState === 'loading' && (
          <View style={styles.imageOverlay}>
            <ActivityIndicator size="small" color={theme.colors.brand} />
            <Text style={styles.loadingText}>Đang tải ảnh...</Text>
          </View>
        )}

        {(loadState === 'error' || loadState === 'missing') && (
          <View style={styles.imageOverlay}>
            <View style={styles.errorIcon}>
              <AppIcon name="broken-image" size={22} color={theme.colors.textMuted} />
            </View>
            <Text style={styles.errorText}>
              {loadState === 'missing' ? 'Không có dữ liệu ảnh' : 'Không thể hiển thị ảnh này'}
            </Text>
          </View>
        )}

        {loadState === 'ready' && (
          <View style={styles.receiptBadge}>
            <AppIcon name="receipt-long" size={12} color="#fff" />
            <Text style={styles.receiptBadgeText}>Hóa đơn</Text>
          </View>
        )}
      </View>

      <View style={styles.captionRow}>
        <AppIcon name="image" size={14} color={foreground} />
        <Text style={[styles.caption, { color: foreground }]} numberOfLines={2}>
          {message?.text || 'Ảnh hóa đơn'}
        </Text>
      </View>

      {statusLabel && (
        <View style={styles.statusRow}>
          {status === 'analyzing'
            ? <ActivityIndicator size={12} color={foreground} />
            : <AppIcon name={status === 'failed' ? 'error-outline' : 'check-circle'} size={13} color={foreground} />}
          <Text style={[styles.statusText, { color: foreground }]}>{statusLabel}</Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (t) => StyleSheet.create({
  container: { width: '100%' },
  imageFrame: {
    width: '100%', minHeight: 132, maxHeight: 260, overflow: 'hidden',
    borderRadius: 15, backgroundColor: t.colors.surfaceAlt,
  },
  image: { width: '100%', height: '100%' },
  imageHidden: { opacity: 0 },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: t.colors.surfaceAlt, padding: 16,
  },
  loadingText: { color: t.colors.textMuted, fontSize: 11, fontWeight: '700' },
  errorIcon: {
    width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.colors.surface,
  },
  errorText: { color: t.colors.textMuted, fontSize: 11, lineHeight: 15, fontWeight: '700', textAlign: 'center' },
  receiptBadge: {
    position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(15, 16, 36, 0.68)',
  },
  receiptBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  captionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 5 },
  caption: { flex: 1, fontSize: 12, lineHeight: 16, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingBottom: 7 },
  statusText: { flexShrink: 1, fontSize: 10, lineHeight: 13, fontWeight: '700', opacity: 0.84 },
});
