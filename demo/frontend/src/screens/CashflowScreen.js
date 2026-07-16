import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { api } from '../services/api.service';
import { useTheme } from '../theme/ThemeContext';
import { formatVND } from '../utils/formatters';
import AppIcon from '../components/AppIcon';
import { Button, EmptyState, ErrorState, Skeleton } from '../components/ui';

const PERIODS = [
  { key: 'month', label: 'Tháng này' },
  { key: 'quarter', label: 'Quý này' },
  { key: 'year', label: 'Năm nay' },
];

function CashflowBar({ label, value, maxValue, color, styles }) {
  const pct = maxValue > 0 ? Math.min(100, (Math.abs(value) / maxValue) * 100) : 0;
  return (
    <View style={styles.barGroup}>
      <View style={styles.barHeader}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={[styles.barValue, { color }]}>{formatVND(Math.abs(value))}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export default function CashflowScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const c = theme.colors;

  const TRANSFER_TYPES = [
    { key: 'transfer', label: 'Điều chuyển', icon: 'swap-horiz', color: c.brand },
    { key: 'investment_inflow', label: 'Nạp đầu tư', icon: 'trending-up', color: c.income },
    { key: 'investment_outflow', label: 'Rút đầu tư', icon: 'trending-down', color: c.expense },
  ];

  const [netWorth, setNetWorth] = useState(null);
  const [cashflow, setCashflow] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [showPnLForm, setShowPnLForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [transferForm, setTransferForm] = useState({
    from_wallet_id: '', to_wallet_id: '', amount: '', transfer_type: 'transfer', note: '',
  });
  const [pnlForm, setPnlForm] = useState({ wallet_id: '', amount: '', note: '' });

  const load = useCallback(async () => {
    try {
      const [nw, cf, tr] = await Promise.all([
        api.getNetWorth(),
        api.getCashflowReport({ period }),
        api.getTransfers({ limit: 20 }),
      ]);
      setNetWorth(nw.data);
      setCashflow(cf.data);
      setWallets(nw.data?.wallets || []);
      setTransfers(tr.data || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu dòng tiền.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  async function addTransfer() {
    const { from_wallet_id, to_wallet_id, amount, transfer_type, note } = transferForm;
    if (!amount || Number(amount) <= 0) return Alert.alert('Lỗi', 'Nhập số tiền hợp lệ');
    if (!from_wallet_id && !to_wallet_id) return Alert.alert('Lỗi', 'Chọn ít nhất một ví');
    setSaving(true);
    try {
      await api.createTransfer({ from_wallet_id: from_wallet_id || null, to_wallet_id: to_wallet_id || null, amount: Number(amount), transfer_type, note });
      setShowTransferForm(false);
      setTransferForm({ from_wallet_id: '', to_wallet_id: '', amount: '', transfer_type: 'transfer', note: '' });
      await load();
    } catch (err) {
      Alert.alert('Lỗi', err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addPnL() {
    const { wallet_id, amount, note } = pnlForm;
    if (!wallet_id) return Alert.alert('Lỗi', 'Chọn tài khoản đầu tư');
    if (!amount || isNaN(Number(amount))) return Alert.alert('Lỗi', 'Nhập số tiền (dương = lãi, âm = lỗ)');
    setSaving(true);
    try {
      await api.createInvestmentPnL({ wallet_id: Number(wallet_id), amount: Number(amount), note });
      setShowPnLForm(false);
      setPnlForm({ wallet_id: '', amount: '', note: '' });
      await load();
    } catch (err) {
      Alert.alert('Lỗi', err.message);
    } finally {
      setSaving(false);
    }
  }

  const investmentWallets = wallets.filter((w) => ['investment', 'savings'].includes(w.type));
  const maxOp = cashflow ? Math.max(cashflow.operating.income, cashflow.operating.expense, 1) : 1;

  const WalletChips = ({ selected, onSelect, list }) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
      {list.map((w) => {
        const active = selected === String(w.id);
        return (
          <TouchableOpacity
            key={w.id}
            style={[styles.walletChip, active && styles.walletChipActive]}
            onPress={() => onSelect(String(w.id))}
          >
            <Text style={[styles.walletChipText, active && { color: c.onBrand }]}>{w.name}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <Skeleton height={160} radius={24} style={{ marginBottom: 12 }} />
        <Skeleton height={180} radius={18} style={{ marginBottom: 12 }} />
        <Skeleton height={64} radius={16} />
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brand} />}
    >
      <View style={styles.netWorthCard}>
        <View style={styles.netWorthHeader}>
          <AppIcon name="account-balance" size={18} color="#fff" />
          <Text style={styles.netWorthTitle}>Tài sản ròng (Net Worth)</Text>
        </View>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={styles.netWorthValue}>{formatVND(netWorth?.net_worth || 0)}</Text>
        <View style={styles.netWorthBreakdown}>
          <View style={{ flex: 1 }}>
            <Text style={styles.nwLabel}>💰 Ví thường</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.nwValue}>{formatVND(netWorth?.regular_wallets || 0)}</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={styles.nwLabel}>📈 Đầu tư</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.nwValue}>{formatVND(netWorth?.investment_wallets || 0)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.periodRow}>
        {PERIODS.map((p) => {
          const active = period === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodBtn, active && styles.periodBtnActive]}
              onPress={() => setPeriod(p.key)}
            >
              <Text style={[styles.periodText, active && { color: c.onBrand }]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {cashflow && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dòng tiền hoạt động</Text>
          <CashflowBar label="Thu nhập" value={cashflow.operating.income} maxValue={maxOp} color={c.income} styles={styles} />
          <CashflowBar label="Chi tiêu" value={cashflow.operating.expense} maxValue={maxOp} color={c.expense} styles={styles} />
          <View style={styles.netRow}>
            <Text style={styles.netLabel}>Chênh lệch:</Text>
            <Text style={[styles.netValue, { color: cashflow.operating.net >= 0 ? c.income : c.expense }]}>
              {cashflow.operating.net >= 0 ? '+' : ''}{formatVND(cashflow.operating.net)}
            </Text>
          </View>

          {(cashflow.investment.inflow > 0 || cashflow.investment.outflow > 0 || cashflow.investment.pnl !== 0) && (
            <>
              <View style={styles.divider} />
              <Text style={styles.cardTitle}>Dòng tiền đầu tư</Text>
              <View style={styles.investRow}>
                <Text style={styles.investLabel}>Nạp đầu tư</Text>
                <Text style={[styles.investValue, { color: c.expense }]}>-{formatVND(cashflow.investment.inflow)}</Text>
              </View>
              <View style={styles.investRow}>
                <Text style={styles.investLabel}>Rút đầu tư</Text>
                <Text style={[styles.investValue, { color: c.income }]}>+{formatVND(cashflow.investment.outflow)}</Text>
              </View>
              <View style={styles.investRow}>
                <Text style={styles.investLabel}>Lãi/Lỗ</Text>
                <Text style={[styles.investValue, { color: cashflow.investment.pnl >= 0 ? c.income : c.expense }]}>
                  {cashflow.investment.pnl >= 0 ? '+' : ''}{formatVND(cashflow.investment.pnl)}
                </Text>
              </View>
            </>
          )}

          <View style={styles.divider} />
          <View style={styles.netRow}>
            <Text style={[styles.netLabel, { fontWeight: '900' }]}>Dòng tiền ròng:</Text>
            <Text style={[styles.netValue, { color: cashflow.net_cashflow >= 0 ? c.income : c.expense }]}>
              {cashflow.net_cashflow >= 0 ? '+' : ''}{formatVND(cashflow.net_cashflow)}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.actionRow}>
        <Button label="Chuyển tiền" icon="swap-horiz" onPress={() => setShowTransferForm((v) => !v)} style={{ flexGrow: 1, flexBasis: 140 }} fullWidth={false} />
        <Button label="Lãi/Lỗ đầu tư" icon="trending-up" variant="secondary" onPress={() => setShowPnLForm((v) => !v)} style={{ flexGrow: 1, flexBasis: 140 }} fullWidth={false} />
      </View>

      {showTransferForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Tạo giao dịch chuyển tiền</Text>
          <Text style={styles.formLabel}>Loại giao dịch</Text>
          <View style={styles.transferTypeRow}>
            {TRANSFER_TYPES.map((t) => {
              const active = transferForm.transfer_type === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeChip, active && { backgroundColor: t.color, borderColor: t.color }]}
                  onPress={() => setTransferForm((f) => ({ ...f, transfer_type: t.key }))}
                >
                  <AppIcon name={t.icon} size={13} color={active ? '#fff' : c.textMuted} />
                  <Text style={[styles.typeChipText, active && { color: '#fff' }]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.formLabel}>Ví nguồn</Text>
          <WalletChips selected={transferForm.from_wallet_id} onSelect={(v) => setTransferForm((f) => ({ ...f, from_wallet_id: v }))} list={wallets} />
          <Text style={styles.formLabel}>Ví đích</Text>
          <WalletChips selected={transferForm.to_wallet_id} onSelect={(v) => setTransferForm((f) => ({ ...f, to_wallet_id: v }))} list={wallets} />

          <TextInput style={styles.input} placeholder="Số tiền" placeholderTextColor={c.textMuted}
            value={transferForm.amount} onChangeText={(v) => setTransferForm((f) => ({ ...f, amount: v }))} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Ghi chú (tùy chọn)" placeholderTextColor={c.textMuted}
            value={transferForm.note} onChangeText={(v) => setTransferForm((f) => ({ ...f, note: v }))} />

          <Button label="Tạo giao dịch" onPress={addTransfer} loading={saving} />
        </View>
      )}

      {showPnLForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Ghi nhận lãi / lỗ đầu tư</Text>
          <Text style={styles.formLabel}>Tài khoản đầu tư</Text>
          {investmentWallets.length === 0 ? (
            <Text style={{ color: c.textMuted, fontSize: 13, marginBottom: 10 }}>
              Chưa có tài khoản đầu tư. Hãy tạo ví loại "Investment" trong phần Ví.
            </Text>
          ) : (
            <WalletChips selected={pnlForm.wallet_id} onSelect={(v) => setPnlForm((f) => ({ ...f, wallet_id: v }))} list={investmentWallets} />
          )}

          <TextInput style={styles.input} placeholder="Số tiền (dương = lãi, âm = lỗ, VD: -500000)"
            placeholderTextColor={c.textMuted} value={pnlForm.amount}
            onChangeText={(v) => setPnlForm((f) => ({ ...f, amount: v }))} keyboardType="numbers-and-punctuation" />
          <TextInput style={styles.input} placeholder="Ghi chú (VD: lãi chứng khoán tháng 6)"
            placeholderTextColor={c.textMuted} value={pnlForm.note}
            onChangeText={(v) => setPnlForm((f) => ({ ...f, note: v }))} />

          <Button label="Lưu lãi/lỗ" onPress={addPnL} loading={saving} />
        </View>
      )}

      <Text style={styles.sectionTitle}>Lịch sử chuyển tiền gần đây</Text>
      {transfers.length > 0 ? (
        <>
          {transfers.map((t) => {
            const meta = TRANSFER_TYPES.find((tt) => tt.key === t.transfer_type) || TRANSFER_TYPES[0];
            return (
              <View key={t.id} style={styles.transferRow}>
                <View style={[styles.transferIcon, { backgroundColor: meta.color + '20' }]}>
                  <AppIcon name={meta.icon} size={18} color={meta.color} />
                </View>
                <View style={styles.transferInfo}>
                  <Text style={styles.transferType}>{meta.label}</Text>
                  <Text numberOfLines={1} style={styles.transferMeta}>{t.from_wallet_name || '?'} → {t.to_wallet_name || '?'}</Text>
                </View>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={[styles.transferAmount, { color: meta.color }]}>{formatVND(t.amount)}</Text>
              </View>
            );
          })}
        </>
      ) : (
        <EmptyState
          emoji="⇄"
          title="Chưa có lịch sử điều chuyển"
          message="Các giao dịch giữa ví và tài khoản đầu tư sẽ xuất hiện tại đây."
          style={styles.compactEmpty}
        />
      )}
    </ScrollView>
  );
}

const createStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.bg },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.bg },
  loadingScreen: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, backgroundColor: t.colors.bg },

  netWorthCard: { backgroundColor: t.colors.brand, borderRadius: t.radius.xl, padding: 20, marginBottom: 14, ...t.shadows.md },
  netWorthHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, opacity: 0.9 },
  netWorthTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
  netWorthValue: { color: '#fff', fontSize: 32, fontWeight: '900', marginBottom: 16 },
  netWorthBreakdown: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: t.radius.md, padding: 12 },
  nwLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginBottom: 4 },
  nwValue: { color: '#fff', fontWeight: '800', fontSize: 15 },

  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  periodBtn: {
    flex: 1, paddingVertical: 9, borderRadius: t.radius.pill,
    backgroundColor: t.colors.surface, borderWidth: 1.5, borderColor: t.colors.border, alignItems: 'center',
  },
  periodBtnActive: { backgroundColor: t.colors.brand, borderColor: t.colors.brand },
  periodText: { fontSize: 12, color: t.colors.textMuted, fontWeight: '700' },

  card: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, padding: 16, borderWidth: 1, borderColor: t.colors.border, marginBottom: 14, ...t.shadows.sm },
  cardTitle: { fontSize: 14, fontWeight: '800', color: t.colors.text, marginBottom: 10 },
  barGroup: { marginBottom: 12 },
  barHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 7 },
  barLabel: { flex: 1, fontSize: 12, color: t.colors.textMuted, fontWeight: '700' },
  barTrack: { flex: 1, height: 8, backgroundColor: t.colors.surfaceAlt, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barValue: { flexShrink: 1, maxWidth: '62%', textAlign: 'right', fontSize: 13, fontWeight: '800' },
  netRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  netLabel: { color: t.colors.textMuted, fontSize: 13, fontWeight: '700' },
  netValue: { fontSize: 15, fontWeight: '800' },
  divider: { height: 1, backgroundColor: t.colors.border, marginVertical: 12 },
  investRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  investLabel: { color: t.colors.textMuted, fontSize: 13 },
  investValue: { fontSize: 13, fontWeight: '700' },

  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },

  formCard: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, padding: 16, borderWidth: 1, borderColor: t.colors.border, marginBottom: 14, ...t.shadows.sm },
  formTitle: { fontSize: 15, fontWeight: '800', color: t.colors.text, marginBottom: 14 },
  formLabel: { color: t.colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  transferTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  typeChip: {
    flexGrow: 1, flexBasis: 90, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 8, borderRadius: t.radius.md, borderWidth: 1.5, borderColor: t.colors.border, backgroundColor: t.colors.surfaceAlt,
  },
  typeChipText: { fontSize: 11, fontWeight: '700', color: t.colors.textMuted },
  walletChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: t.radius.pill, backgroundColor: t.colors.surfaceAlt, borderWidth: 1.5, borderColor: t.colors.border },
  walletChipActive: { backgroundColor: t.colors.brand, borderColor: t.colors.brand },
  walletChipText: { fontSize: 13, color: t.colors.textSecondary, fontWeight: '600' },
  input: { borderWidth: 1.5, borderColor: t.colors.border, borderRadius: t.radius.md, padding: 13, marginBottom: 12, fontSize: 14, color: t.colors.text, backgroundColor: t.colors.surfaceAlt },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: t.colors.text, marginBottom: 10 },
  transferRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.colors.surface, padding: 13, borderRadius: t.radius.md, marginBottom: 8, borderWidth: 1, borderColor: t.colors.border, ...t.shadows.sm },
  transferIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  transferInfo: { flex: 1, minWidth: 0 },
  transferType: { fontSize: 14, fontWeight: '700', color: t.colors.text },
  transferMeta: { fontSize: 12, color: t.colors.textMuted },
  transferAmount: { flexShrink: 1, maxWidth: '40%', textAlign: 'right', fontSize: 15, fontWeight: '800' },
  compactEmpty: { paddingVertical: 24, marginBottom: 8 },
});
