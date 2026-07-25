import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Switch, Linking, Platform,
} from 'react-native';
import { api } from '../services/api.service';
import { useTheme } from '../theme/ThemeContext';
import { HIT_SLOP } from '../theme/tokens';
import { showAlert } from '../utils/alerts';
import AppIcon from '../components/AppIcon';
import { EmptyState, ErrorState, Skeleton } from '../components/ui';

function ExportHistoryItem({ item, onDelete, onDownload, styles, c }) {
  const typeMeta = {
    csv: { label: 'CSV', icon: 'table-chart', color: c.income, bg: c.incomeSoft },
    pdf: { label: 'Báo cáo', icon: 'picture-as-pdf', color: c.expense, bg: c.expenseSoft },
    backup: { label: 'Backup', icon: 'cloud-done', color: c.brand, bg: c.brandSoft },
  };
  const meta = typeMeta[item.export_type] || typeMeta.csv;
  const created = new Date(item.created_at);
  const dateStr = created.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = created.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const size = item.file_size ? `${(item.file_size / 1024).toFixed(1)} KB` : '—';

  return (
    <View style={styles.historyItem}>
      <View style={[styles.historyIcon, { backgroundColor: meta.bg }]}>
        <AppIcon name={meta.icon} size={18} color={meta.color} />
      </View>
      <View style={styles.historyInfo}>
        <View style={styles.historyTitleRow}>
          <Text style={styles.historyType}>{meta.label}</Text>
          {item.is_auto && <View style={styles.autoBadge}><Text style={styles.autoBadgeText}>Tự động</Text></View>}
          {item.status === 'failed' && <View style={[styles.autoBadge, { backgroundColor: c.expenseSoft }]}><Text style={[styles.autoBadgeText, { color: c.expense }]}>Lỗi</Text></View>}
        </View>
        {item.label && <Text numberOfLines={1} style={styles.historyLabel}>{item.label}</Text>}
        <Text numberOfLines={1} style={styles.historyMeta}>{dateStr} {timeStr} · {size}</Text>
      </View>
      <View style={styles.historyActions}>
        {item.file_available && (
          <TouchableOpacity
            onPress={() => onDownload(item.id)}
            style={styles.dlBtn}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={`Tải xuống bản xuất ${meta.label}`}
          >
            <AppIcon name="download" size={18} color={c.brand} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => onDelete(item.id)}
          style={styles.delBtn}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={`Xóa bản xuất ${meta.label}`}
        >
          <AppIcon name="delete-outline" size={18} color={c.expense} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const FREQ_OPTIONS = [
  { key: 'daily', label: 'Hàng ngày' },
  { key: 'weekly', label: 'Hàng tuần' },
  { key: 'monthly', label: 'Hàng tháng' },
];

export default function ExportScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const c = theme.colors;

  const [history, setHistory] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [hist, cfg] = await Promise.all([api.getExportHistory(), api.getBackupConfig()]);
      setHistory(hist.data || []);
      setConfig(cfg.data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Không thể tải lịch sử xuất.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  async function doExport(format) {
    setExporting(format);
    try {
      const result = await api.exportFromIntent(format, {});
      if (result.data?.download_url) {
        const url = api.getBaseUrl() + result.data.download_url;
        showAlert('✅ Xuất thành công', `File: ${result.data.file_name}\nTruy cập server để tải file.`, [
          { text: 'Mở link', onPress: () => Linking.openURL(url) },
          { text: 'OK' },
        ]);
      }
      await load();
    } catch (err) {
      showAlert('Lỗi', err.message);
    } finally {
      setExporting(null);
    }
  }

  function handleDelete(id) {
    showAlert('Xoá bản ghi', 'Xoá file này? Không thể hoàn tác.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá', style: 'destructive', onPress: async () => {
          try { await api.deleteExportHistory(id); setHistory((h) => h.filter((i) => i.id !== id)); }
          catch (err) { showAlert('Lỗi', err.message); }
        },
      },
    ]);
  }

  async function handleDownload(id) {
    const url = api.getDownloadUrl(id);
    try { await Linking.openURL(url); }
    catch { showAlert('Lỗi', 'Không thể mở URL. Thử copy: ' + url); }
  }

  async function toggleAutoBackup(value) {
    try { const updated = await api.updateBackupConfig({ auto_enabled: value }); setConfig(updated.data); }
    catch (err) { showAlert('Lỗi', err.message); }
  }

  async function changeFrequency(freq) {
    try { const updated = await api.updateBackupConfig({ frequency: freq }); setConfig(updated.data); }
    catch (err) { showAlert('Lỗi', err.message); }
  }

  function pickBackupFile() {
    if (restoring) return;
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
    } else {
      // No document picker is bundled in the demo; restore is exercised on the
      // web build. Guide native users rather than failing silently.
      showAlert(
        'Khôi phục trên web',
        'Tính năng chọn file backup hiện hỗ trợ trên bản web. Hãy mở PERFIN trên trình duyệt để khôi phục từ file .pfbak.'
      );
    }
  }

  function confirmRestore(file) {
    showAlert(
      'Khôi phục từ backup?',
      'Toàn bộ giao dịch, ngân sách, điều chuyển và lãi/lỗ hiện tại sẽ bị thay thế bằng dữ liệu trong file backup. Hành động này không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Khôi phục', style: 'destructive', onPress: () => runRestore(file) },
      ]
    );
  }

  async function runRestore(file) {
    setRestoring(true);
    try {
      const result = await api.restoreBackup(file);
      const summary = result.data?.restored || result.data || {};
      const parts = [
        summary.transactions != null ? `${summary.transactions} giao dịch` : null,
        summary.budgets != null ? `${summary.budgets} ngân sách` : null,
        summary.wallet_transfers != null ? `${summary.wallet_transfers} điều chuyển` : null,
        summary.investment_pnl != null ? `${summary.investment_pnl} lãi/lỗ` : null,
      ].filter(Boolean);
      showAlert('✅ Khôi phục thành công', parts.length ? `Đã khôi phục: ${parts.join(', ')}.` : 'Dữ liệu đã được khôi phục từ backup.');
      await load();
    } catch (err) {
      showAlert('Khôi phục thất bại', err.message || 'Không đọc được file backup.');
    } finally {
      setRestoring(false);
    }
  }

  function onWebFileSelected(event) {
    const file = event?.target?.files?.[0];
    if (event?.target) event.target.value = '';
    if (file) confirmRestore(file);
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <Skeleton height={128} radius={20} style={{ marginBottom: 16 }} />
        <Skeleton height={112} radius={18} style={{ marginBottom: 16 }} />
        <Skeleton height={72} radius={16} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorState message={error} onRetry={() => { setLoading(true); setError(null); load(); }} />
      </View>
    );
  }

  const EXPORT_CARDS = [
    { format: 'csv', icon: 'table-chart', title: 'Xuất CSV', desc: 'Danh sách giao dịch\nmã hóa UTF-8', color: c.income },
    { format: 'pdf', icon: 'picture-as-pdf', title: 'Báo cáo', desc: 'Báo cáo HTML\nin PDF qua trình duyệt', color: c.expense },
    { format: 'backup', icon: 'cloud-done', title: 'Sao lưu', desc: 'File mã hóa\nAES-256', color: c.brand },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brand} />}
    >
      <Text style={styles.sectionTitle}>Xuất dữ liệu nhanh</Text>
      <View style={styles.exportGrid}>
        {EXPORT_CARDS.map((card) => (
          <TouchableOpacity
            key={card.format}
            style={[styles.exportCard, { borderColor: card.color }]}
            onPress={() => doExport(card.format)}
            disabled={!!exporting}
          >
            {exporting === card.format
              ? <ActivityIndicator color={card.color} size="small" />
              : <AppIcon name={card.icon} size={28} color={card.color} />}
            <Text style={[styles.exportCardTitle, { color: card.color }]}>{card.title}</Text>
            <Text style={styles.exportCardDesc}>{card.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Sao lưu tự động</Text>
      <View style={styles.configCard}>
        <View style={styles.configRow}>
          <View style={styles.configLeft}>
            <AppIcon name="schedule" size={16} color={c.brandText} />
            <Text style={styles.configLabel}>Bật sao lưu tự động</Text>
          </View>
          <Switch
            value={config?.auto_enabled || false}
            onValueChange={toggleAutoBackup}
            trackColor={{ false: c.border, true: c.brand }}
            thumbColor={'#fff'}
          />
        </View>

        {config?.auto_enabled && (
          <>
            <View style={styles.divider} />
            <Text style={[styles.configLabel, { marginBottom: 10 }]}>Tần suất</Text>
            <View style={styles.freqRow}>
              {FREQ_OPTIONS.map((f) => {
                const active = config?.frequency === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.freqChip, active && styles.freqChipActive]}
                    onPress={() => changeFrequency(f.key)}
                  >
                    <Text style={[styles.freqText, active && styles.freqTextActive]}>{f.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {config?.last_backup_at && (
              <Text style={styles.lastBackupText}>
                Sao lưu lần cuối: {new Date(config.last_backup_at).toLocaleString('vi-VN')}
              </Text>
            )}
          </>
        )}
      </View>

      <Text style={styles.sectionTitle}>Khôi phục từ bản sao lưu</Text>
      <View style={styles.configCard}>
        <View style={styles.restoreRow}>
          <View style={styles.restoreIcon}>
            <AppIcon name="restore" size={18} color={c.brand} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.configLabel}>Nạp lại dữ liệu từ file .pfbak</Text>
            <Text style={styles.restoreHint}>
              Ghi đè toàn bộ giao dịch, ngân sách, chuyển tiền và lãi/lỗ hiện tại bằng nội dung trong bản sao lưu.
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.restoreButton, restoring && { opacity: 0.6 }]}
          onPress={pickBackupFile}
          disabled={restoring}
          accessibilityRole="button"
          accessibilityLabel="Chọn file backup để khôi phục"
        >
          {restoring
            ? <ActivityIndicator size="small" color={c.onBrand} />
            : <AppIcon name="upload-file" size={18} color={c.onBrand} />}
          <Text style={styles.restoreButtonText}>{restoring ? 'Đang khôi phục...' : 'Chọn file & khôi phục'}</Text>
        </TouchableOpacity>
        {Platform.OS === 'web' && (
          <input
            ref={fileInputRef}
            type="file"
            accept=".pfbak,application/octet-stream"
            style={{ display: 'none' }}
            onChange={onWebFileSelected}
          />
        )}
      </View>

      <View style={styles.infoBox}>
        <AppIcon name="info-outline" size={16} color={c.brandText} />
        <Text style={styles.infoText}>
          File backup được mã hóa AES-256-GCM với checksum SHA-256; chỉ khôi phục được từ file .pfbak do PERFIN tạo.{'\n'}
          File CSV dùng mã UTF-8, có thể mở bằng Excel/Google Sheets.{'\n'}
          File báo cáo là HTML — in PDF bằng trình duyệt (Ctrl+P).
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Lịch sử xuất & sao lưu ({history.length})</Text>
      {history.length === 0 ? (
        <EmptyState emoji="📁" title="Chưa có lịch sử xuất" message="Các file dữ liệu và bản sao lưu sẽ xuất hiện tại đây." />
      ) : (
        history.map((item) => (
          <ExportHistoryItem key={item.id} item={item} onDelete={handleDelete} onDownload={handleDownload} styles={styles} c={c} />
        ))
      )}
    </ScrollView>
  );
}

const createStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.bg },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.bg },
  loadingScreen: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, backgroundColor: t.colors.bg },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: t.colors.text, marginBottom: 12 },

  exportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  exportCard: {
    flexGrow: 1, flexBasis: 112, alignItems: 'center', gap: 8,
    backgroundColor: t.colors.surface, padding: 14, borderRadius: t.radius.lg, borderWidth: 1.5,
    ...t.shadows.sm, minHeight: 120, justifyContent: 'center',
  },
  exportCardTitle: { fontSize: 13, fontWeight: '800' },
  exportCardDesc: { fontSize: 11, color: t.colors.textMuted, textAlign: 'center', lineHeight: 16 },

  configCard: {
    backgroundColor: t.colors.surface, borderRadius: t.radius.lg, padding: 16,
    borderWidth: 1, borderColor: t.colors.border, marginBottom: 16, ...t.shadows.sm,
  },
  configRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  configLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  configLabel: { fontSize: 14, fontWeight: '700', color: t.colors.text },
  divider: { height: 1, backgroundColor: t.colors.border, marginVertical: 12 },
  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  freqChip: {
    flexGrow: 1, flexBasis: 92, paddingVertical: 9, borderRadius: t.radius.pill,
    backgroundColor: t.colors.surfaceAlt, borderWidth: 1.5, borderColor: t.colors.border, alignItems: 'center',
  },
  freqChipActive: { backgroundColor: t.colors.brand, borderColor: t.colors.brand },
  freqText: { fontSize: 12, color: t.colors.textMuted, fontWeight: '700' },
  freqTextActive: { color: '#fff' },
  lastBackupText: { marginTop: 10, color: t.colors.textMuted, fontSize: 12 },

  restoreRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  restoreIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: t.colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  restoreHint: { color: t.colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  restoreButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44,
    backgroundColor: t.colors.brand, borderRadius: t.radius.md,
  },
  restoreButtonText: { color: t.colors.onBrand, fontWeight: '800', fontSize: 14 },

  infoBox: {
    flexDirection: 'row', gap: 10, backgroundColor: t.colors.brandSoft,
    padding: 14, borderRadius: t.radius.md, marginBottom: 20, alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 12, color: t.colors.brandText, lineHeight: 18 },

  historyItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.colors.surface,
    padding: 13, borderRadius: t.radius.md, marginBottom: 8, borderWidth: 1, borderColor: t.colors.border, ...t.shadows.sm,
  },
  historyIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  historyInfo: { flex: 1, minWidth: 0 },
  historyTitleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 2 },
  historyType: { fontWeight: '800', fontSize: 14, color: t.colors.text },
  autoBadge: { backgroundColor: t.colors.brandSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: t.radius.pill },
  autoBadgeText: { color: t.colors.brandText, fontSize: 10, fontWeight: '700' },
  historyLabel: { color: t.colors.textSecondary, fontSize: 12, marginBottom: 2 },
  historyMeta: { color: t.colors.textMuted, fontSize: 11 },
  historyActions: { flexDirection: 'row', gap: 4 },
  dlBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: t.colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  delBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: t.colors.expenseSoft, alignItems: 'center', justifyContent: 'center' },

  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyMsg: { color: t.colors.textMuted, fontWeight: '600' },
});
