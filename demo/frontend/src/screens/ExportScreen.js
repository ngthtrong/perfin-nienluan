import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, ActivityIndicator, Switch, Linking,
} from 'react-native';
import { api } from '../services/api.service';
import { COLORS, SHADOWS, RADIUS } from '../utils/constants';
import AppIcon from '../components/AppIcon';

const EXPORT_TYPE_META = {
  csv:    { label: 'CSV',    icon: 'table-chart',   color: COLORS.income,   bg: COLORS.incomeLight },
  pdf:    { label: 'Báo cáo', icon: 'picture-as-pdf', color: '#EC4899',       bg: '#FDF2F8' },
  backup: { label: 'Backup', icon: 'cloud-done',    color: '#6366F1',       bg: '#EEF2FF' },
};

const FREQ_OPTIONS = [
  { key: 'daily',   label: 'Hàng ngày' },
  { key: 'weekly',  label: 'Hàng tuần' },
  { key: 'monthly', label: 'Hàng tháng' },
];

function ExportHistoryItem({ item, onDelete, onDownload }) {
  const meta = EXPORT_TYPE_META[item.export_type] || EXPORT_TYPE_META.csv;
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
          {item.status === 'failed' && <View style={[styles.autoBadge, { backgroundColor: COLORS.expenseLight }]}><Text style={[styles.autoBadgeText, { color: COLORS.expense }]}>Lỗi</Text></View>}
        </View>
        {item.label && <Text style={styles.historyLabel}>{item.label}</Text>}
        <Text style={styles.historyMeta}>{dateStr} {timeStr} · {size}</Text>
      </View>
      <View style={styles.historyActions}>
        {item.file_available && (
          <TouchableOpacity onPress={() => onDownload(item.id)} style={styles.dlBtn}>
            <AppIcon name="download" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => onDelete(item.id)} style={styles.delBtn}>
          <AppIcon name="delete-outline" size={18} color={COLORS.expense} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ExportScreen() {
  const [history, setHistory] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(null); // 'csv'|'pdf'|'backup'|null

  const load = useCallback(async () => {
    try {
      const [hist, cfg] = await Promise.all([api.getExportHistory(), api.getBackupConfig()]);
      setHistory(hist.data || []);
      setConfig(cfg.data);
    } catch (err) {
      Alert.alert('Lỗi', err.message);
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
        const url = api.getBaseUrl() + result.data.download_url.replace(/^\/api/, '/api');
        Alert.alert(
          '✅ Xuất thành công',
          `File: ${result.data.file_name}\nTruy cập server để tải file.`,
          [
            { text: 'Mở link', onPress: () => Linking.openURL(url) },
            { text: 'OK' },
          ]
        );
      }
      await load();
    } catch (err) {
      Alert.alert('Lỗi', err.message);
    } finally {
      setExporting(null);
    }
  }

  async function handleDelete(id) {
    Alert.alert('Xoá bản ghi', 'Xoá file này? Không thể hoàn tác.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá', style: 'destructive', onPress: async () => {
          try {
            await api.deleteExportHistory(id);
            setHistory((h) => h.filter((i) => i.id !== id));
          } catch (err) {
            Alert.alert('Lỗi', err.message);
          }
        },
      },
    ]);
  }

  async function handleDownload(id) {
    const url = api.getDownloadUrl(id);
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Lỗi', 'Không thể mở URL. Thử copy: ' + url);
    }
  }

  async function toggleAutoBackup(value) {
    try {
      const updated = await api.updateBackupConfig({ auto_enabled: value });
      setConfig(updated.data);
    } catch (err) {
      Alert.alert('Lỗi', err.message);
    }
  }

  async function changeFrequency(freq) {
    try {
      const updated = await api.updateBackupConfig({ frequency: freq });
      setConfig(updated.data);
    } catch (err) {
      Alert.alert('Lỗi', err.message);
    }
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* ── Quick Export actions ── */}
      <Text style={styles.sectionTitle}>Xuất dữ liệu nhanh</Text>
      <View style={styles.exportGrid}>
        {/* CSV */}
        <TouchableOpacity
          style={[styles.exportCard, { borderColor: COLORS.income }]}
          onPress={() => doExport('csv')}
          disabled={!!exporting}
        >
          {exporting === 'csv' ? (
            <ActivityIndicator color={COLORS.income} size="small" />
          ) : (
            <AppIcon name="table-chart" size={28} color={COLORS.income} />
          )}
          <Text style={[styles.exportCardTitle, { color: COLORS.income }]}>Xuất CSV</Text>
          <Text style={styles.exportCardDesc}>Danh sách giao dịch{'\n'}mã hóa UTF-8</Text>
        </TouchableOpacity>

        {/* PDF/HTML Report */}
        <TouchableOpacity
          style={[styles.exportCard, { borderColor: '#EC4899' }]}
          onPress={() => doExport('pdf')}
          disabled={!!exporting}
        >
          {exporting === 'pdf' ? (
            <ActivityIndicator color="#EC4899" size="small" />
          ) : (
            <AppIcon name="picture-as-pdf" size={28} color="#EC4899" />
          )}
          <Text style={[styles.exportCardTitle, { color: '#EC4899' }]}>Báo cáo</Text>
          <Text style={styles.exportCardDesc}>Báo cáo tài chính{'\n'}có biểu đồ</Text>
        </TouchableOpacity>

        {/* Backup */}
        <TouchableOpacity
          style={[styles.exportCard, { borderColor: '#6366F1' }]}
          onPress={() => doExport('backup')}
          disabled={!!exporting}
        >
          {exporting === 'backup' ? (
            <ActivityIndicator color="#6366F1" size="small" />
          ) : (
            <AppIcon name="cloud-done" size={28} color="#6366F1" />
          )}
          <Text style={[styles.exportCardTitle, { color: '#6366F1' }]}>Sao lưu</Text>
          <Text style={styles.exportCardDesc}>File mã hóa{'\n'}AES-256</Text>
        </TouchableOpacity>
      </View>

      {/* ── Auto backup config ── */}
      <Text style={styles.sectionTitle}>Sao lưu tự động</Text>
      <View style={styles.configCard}>
        <View style={styles.configRow}>
          <View style={styles.configLeft}>
            <AppIcon name="schedule" size={16} color={COLORS.primary} />
            <Text style={styles.configLabel}>Bật sao lưu tự động</Text>
          </View>
          <Switch
            value={config?.auto_enabled || false}
            onValueChange={toggleAutoBackup}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor={config?.auto_enabled ? '#fff' : COLORS.muted}
          />
        </View>

        {config?.auto_enabled && (
          <>
            <View style={styles.divider} />
            <Text style={[styles.configLabel, { marginBottom: 10 }]}>Tần suất</Text>
            <View style={styles.freqRow}>
              {FREQ_OPTIONS.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.freqChip, config?.frequency === f.key && styles.freqChipActive]}
                  onPress={() => changeFrequency(f.key)}
                >
                  <Text style={[styles.freqText, config?.frequency === f.key && styles.freqTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {config?.last_backup_at && (
              <Text style={styles.lastBackupText}>
                Sao lưu lần cuối: {new Date(config.last_backup_at).toLocaleString('vi-VN')}
              </Text>
            )}
          </>
        )}
      </View>

      {/* ── Export Info ── */}
      <View style={styles.infoBox}>
        <AppIcon name="info-outline" size={16} color={COLORS.primary} />
        <Text style={styles.infoText}>
          File backup được mã hóa AES-256-GCM với checksum SHA-256.{'\n'}
          File CSV dùng mã UTF-8, có thể mở bằng Excel/Google Sheets.{'\n'}
          File báo cáo là HTML — in PDF bằng trình duyệt (Ctrl+P).
        </Text>
      </View>

      {/* ── History ── */}
      <Text style={styles.sectionTitle}>Lịch sử xuất & sao lưu ({history.length})</Text>
      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📁</Text>
          <Text style={styles.emptyMsg}>Chưa có lịch sử xuất nào</Text>
        </View>
      ) : (
        history.map((item) => (
          <ExportHistoryItem
            key={item.id}
            item={item}
            onDelete={handleDelete}
            onDownload={handleDownload}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 12 },

  // Export cards
  exportGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  exportCard: {
    flex: 1, alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface, padding: 16,
    borderRadius: RADIUS.lg, borderWidth: 1.5,
    ...SHADOWS.sm, minHeight: 120, justifyContent: 'center',
  },
  exportCardTitle: { fontSize: 13, fontWeight: '800' },
  exportCardDesc: { fontSize: 11, color: COLORS.muted, textAlign: 'center', lineHeight: 16 },

  // Config
  configCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, ...SHADOWS.sm },
  configRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  configLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  configLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  freqRow: { flexDirection: 'row', gap: 8 },
  freqChip: { flex: 1, paddingVertical: 9, borderRadius: RADIUS.full, backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  freqChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  freqText: { fontSize: 12, color: COLORS.muted, fontWeight: '700' },
  freqTextActive: { color: '#fff' },
  lastBackupText: { marginTop: 10, color: COLORS.muted, fontSize: 12 },

  // Info
  infoBox: { flexDirection: 'row', gap: 10, backgroundColor: COLORS.primaryLight, padding: 14, borderRadius: RADIUS.md, marginBottom: 20, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: 12, color: COLORS.primary, lineHeight: 18 },

  // History
  historyItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, padding: 13, borderRadius: RADIUS.md, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  historyIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  historyInfo: { flex: 1 },
  historyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  historyType: { fontWeight: '800', fontSize: 14, color: COLORS.text },
  autoBadge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full },
  autoBadgeText: { color: COLORS.primary, fontSize: 10, fontWeight: '700' },
  historyLabel: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 2 },
  historyMeta: { color: COLORS.muted, fontSize: 11 },
  historyActions: { flexDirection: 'row', gap: 4 },
  dlBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  delBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.expenseLight, alignItems: 'center', justifyContent: 'center' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyMsg: { color: COLORS.muted, fontWeight: '600' },
});
