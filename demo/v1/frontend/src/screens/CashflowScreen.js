import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, RefreshControl, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { api } from '../services/api.service';
import { COLORS, SHADOWS, RADIUS } from '../utils/constants';
import { formatVND } from '../utils/formatters';
import AppIcon from '../components/AppIcon';

const PERIODS = [
  { key: 'month', label: 'Tháng này' },
  { key: 'quarter', label: 'Quý này' },
  { key: 'year', label: 'Năm nay' },
];

const TRANSFER_TYPES = [
  { key: 'transfer',            label: 'Điều chuyển',  icon: 'swap-horiz',      color: '#6366F1' },
  { key: 'investment_inflow',   label: 'Nạp đầu tư',  icon: 'trending-up',     color: COLORS.income },
  { key: 'investment_outflow',  label: 'Rút đầu tư',  icon: 'trending-down',   color: COLORS.expense },
];

function CashflowBar({ label, value, maxValue, color }) {
  const pct = maxValue > 0 ? Math.min(100, (Math.abs(value) / maxValue) * 100) : 0;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barValue, { color }]}>{formatVND(Math.abs(value))}</Text>
    </View>
  );
}

export default function CashflowScreen() {
  const [netWorth, setNetWorth] = useState(null);
  const [cashflow, setCashflow] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [showPnLForm, setShowPnLForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Transfer form state
  const [transferForm, setTransferForm] = useState({
    from_wallet_id: '', to_wallet_id: '',
    amount: '', transfer_type: 'transfer', note: '',
  });

  // P&L form state
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
    } catch (err) {
      Alert.alert('Lỗi', err.message);
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

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* ── Net Worth card ── */}
      <View style={styles.netWorthCard}>
        <View style={styles.netWorthHeader}>
          <AppIcon name="account-balance" size={18} color="#fff" />
          <Text style={styles.netWorthTitle}>Tài sản ròng (Net Worth)</Text>
        </View>
        <Text style={styles.netWorthValue}>{formatVND(netWorth?.net_worth || 0)}</Text>
        <View style={styles.netWorthBreakdown}>
          <View style={styles.nwItem}>
            <Text style={styles.nwLabel}>💰 Ví thường</Text>
            <Text style={styles.nwValue}>{formatVND(netWorth?.regular_wallets || 0)}</Text>
          </View>
          <View style={[styles.nwItem, styles.nwItemRight]}>
            <Text style={styles.nwLabel}>📈 Đầu tư</Text>
            <Text style={[styles.nwValue, { color: COLORS.income }]}>{formatVND(netWorth?.investment_wallets || 0)}</Text>
          </View>
        </View>
      </View>

      {/* ── Period selector ── */}
      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Cashflow breakdown ── */}
      {cashflow && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dòng tiền hoạt động</Text>
          <CashflowBar label="Thu nhập" value={cashflow.operating.income} maxValue={maxOp} color={COLORS.income} />
          <CashflowBar label="Chi tiêu" value={cashflow.operating.expense} maxValue={maxOp} color={COLORS.expense} />
          <View style={styles.netRow}>
            <Text style={styles.netLabel}>Chênh lệch:</Text>
            <Text style={[styles.netValue, { color: cashflow.operating.net >= 0 ? COLORS.income : COLORS.expense }]}>
              {cashflow.operating.net >= 0 ? '+' : ''}{formatVND(cashflow.operating.net)}
            </Text>
          </View>

          {(cashflow.investment.inflow > 0 || cashflow.investment.outflow > 0 || cashflow.investment.pnl !== 0) && (
            <>
              <View style={styles.divider} />
              <Text style={styles.cardTitle}>Dòng tiền đầu tư</Text>
              <View style={styles.investRow}>
                <Text style={styles.investLabel}>Nạp đầu tư</Text>
                <Text style={[styles.investValue, { color: COLORS.expense }]}>-{formatVND(cashflow.investment.inflow)}</Text>
              </View>
              <View style={styles.investRow}>
                <Text style={styles.investLabel}>Rút đầu tư</Text>
                <Text style={[styles.investValue, { color: COLORS.income }]}>+{formatVND(cashflow.investment.outflow)}</Text>
              </View>
              <View style={styles.investRow}>
                <Text style={styles.investLabel}>Lãi/Lỗ</Text>
                <Text style={[styles.investValue, { color: cashflow.investment.pnl >= 0 ? COLORS.income : COLORS.expense }]}>
                  {cashflow.investment.pnl >= 0 ? '+' : ''}{formatVND(cashflow.investment.pnl)}
                </Text>
              </View>
            </>
          )}

          <View style={styles.divider} />
          <View style={styles.netRow}>
            <Text style={[styles.netLabel, { fontWeight: '900' }]}>Dòng tiền ròng:</Text>
            <Text style={[styles.netValue, { color: cashflow.net_cashflow >= 0 ? COLORS.income : COLORS.expense }]}>
              {cashflow.net_cashflow >= 0 ? '+' : ''}{formatVND(cashflow.net_cashflow)}
            </Text>
          </View>
        </View>
      )}

      {/* ── Transfer / Investment actions ── */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#6366F1' }]} onPress={() => setShowTransferForm((v) => !v)}>
          <AppIcon name="swap-horiz" size={18} color="#fff" />
          <Text style={styles.actionBtnText}>Chuyển tiền</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.income }]} onPress={() => setShowPnLForm((v) => !v)}>
          <AppIcon name="trending-up" size={18} color="#fff" />
          <Text style={styles.actionBtnText}>Lãi/Lỗ đầu tư</Text>
        </TouchableOpacity>
      </View>

      {/* ── Transfer form ── */}
      {showTransferForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Tạo giao dịch chuyển tiền</Text>

          <Text style={styles.formLabel}>Loại giao dịch</Text>
          <View style={styles.transferTypeRow}>
            {TRANSFER_TYPES.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[styles.typeChip, transferForm.transfer_type === t.key && { backgroundColor: t.color, borderColor: t.color }]}
                onPress={() => setTransferForm((f) => ({ ...f, transfer_type: t.key }))}
              >
                <AppIcon name={t.icon} size={13} color={transferForm.transfer_type === t.key ? '#fff' : COLORS.muted} />
                <Text style={[styles.typeChipText, transferForm.transfer_type === t.key && { color: '#fff' }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.formLabel}>Ví nguồn</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
            {wallets.map((w) => (
              <TouchableOpacity
                key={w.id}
                style={[styles.walletChip, transferForm.from_wallet_id === String(w.id) && styles.walletChipActive]}
                onPress={() => setTransferForm((f) => ({ ...f, from_wallet_id: String(w.id) }))}
              >
                <Text style={[styles.walletChipText, transferForm.from_wallet_id === String(w.id) && { color: '#fff' }]}>{w.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.formLabel}>Ví đích</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
            {wallets.map((w) => (
              <TouchableOpacity
                key={w.id}
                style={[styles.walletChip, transferForm.to_wallet_id === String(w.id) && styles.walletChipActive]}
                onPress={() => setTransferForm((f) => ({ ...f, to_wallet_id: String(w.id) }))}
              >
                <Text style={[styles.walletChipText, transferForm.to_wallet_id === String(w.id) && { color: '#fff' }]}>{w.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput style={styles.input} placeholder="Số tiền" placeholderTextColor={COLORS.muted}
            value={transferForm.amount} onChangeText={(v) => setTransferForm((f) => ({ ...f, amount: v }))} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Ghi chú (tùy chọn)" placeholderTextColor={COLORS.muted}
            value={transferForm.note} onChangeText={(v) => setTransferForm((f) => ({ ...f, note: v }))} />

          <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={addTransfer} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Tạo giao dịch</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* ── P&L form ── */}
      {showPnLForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Ghi nhận lãi / lỗ đầu tư</Text>

          <Text style={styles.formLabel}>Tài khoản đầu tư</Text>
          {investmentWallets.length === 0 ? (
            <Text style={{ color: COLORS.muted, fontSize: 13, marginBottom: 10 }}>Chưa có tài khoản đầu tư. Hãy tạo ví loại "Investment" trong phần Ví.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
              {investmentWallets.map((w) => (
                <TouchableOpacity
                  key={w.id}
                  style={[styles.walletChip, pnlForm.wallet_id === String(w.id) && styles.walletChipActive]}
                  onPress={() => setPnlForm((f) => ({ ...f, wallet_id: String(w.id) }))}
                >
                  <Text style={[styles.walletChipText, pnlForm.wallet_id === String(w.id) && { color: '#fff' }]}>{w.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <TextInput style={styles.input} placeholder="Số tiền (dương = lãi, âm = lỗ, VD: -500000)"
            placeholderTextColor={COLORS.muted} value={pnlForm.amount}
            onChangeText={(v) => setPnlForm((f) => ({ ...f, amount: v }))} keyboardType="numbers-and-punctuation" />
          <TextInput style={styles.input} placeholder="Ghi chú (VD: lãi chứng khoán tháng 6)"
            placeholderTextColor={COLORS.muted} value={pnlForm.note}
            onChangeText={(v) => setPnlForm((f) => ({ ...f, note: v }))} />

          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: COLORS.income }, saving && styles.saveBtnDisabled]} onPress={addPnL} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Lưu lãi/lỗ</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* ── Recent transfers ── */}
      {transfers.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Lịch sử chuyển tiền gần đây</Text>
          {transfers.map((t) => {
            const meta = TRANSFER_TYPES.find((tt) => tt.key === t.transfer_type) || TRANSFER_TYPES[0];
            return (
              <View key={t.id} style={styles.transferRow}>
                <View style={[styles.transferIcon, { backgroundColor: meta.color + '20' }]}>
                  <AppIcon name={meta.icon} size={18} color={meta.color} />
                </View>
                <View style={styles.transferInfo}>
                  <Text style={styles.transferType}>{meta.label}</Text>
                  <Text style={styles.transferMeta}>
                    {t.from_wallet_name || '?'} → {t.to_wallet_name || '?'}
                  </Text>
                </View>
                <Text style={[styles.transferAmount, { color: meta.color }]}>{formatVND(t.amount)}</Text>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Net Worth
  netWorthCard: {
    background: COLORS.primary,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: 20,
    marginBottom: 14,
    ...SHADOWS.md,
  },
  netWorthHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, opacity: 0.9 },
  netWorthTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
  netWorthValue: { color: '#fff', fontSize: 32, fontWeight: '900', marginBottom: 16 },
  netWorthBreakdown: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: RADIUS.md, padding: 12 },
  nwItem: { flex: 1 },
  nwItemRight: { alignItems: 'flex-end' },
  nwLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4 },
  nwValue: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Period
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  periodBtn: { flex: 1, paddingVertical: 9, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  periodBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  periodText: { fontSize: 12, color: COLORS.muted, fontWeight: '700' },
  periodTextActive: { color: '#fff' },

  // Card
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14, ...SHADOWS.sm },
  cardTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  barLabel: { width: 72, fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  barTrack: { flex: 1, height: 8, backgroundColor: COLORS.borderLight, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barValue: { width: 90, textAlign: 'right', fontSize: 13, fontWeight: '700' },
  netRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  netLabel: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  netValue: { fontSize: 15, fontWeight: '800' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  investRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  investLabel: { color: COLORS.muted, fontSize: 13 },
  investValue: { fontSize: 13, fontWeight: '700' },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 13, borderRadius: RADIUS.md, ...SHADOWS.sm },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  // Form
  formCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14, ...SHADOWS.sm },
  formTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 14 },
  formLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  transferTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  typeChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.background },
  typeChipText: { fontSize: 11, fontWeight: '700', color: COLORS.muted },
  walletChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border },
  walletChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  walletChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  input: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 13, marginBottom: 12, fontSize: 14, color: COLORS.text, backgroundColor: COLORS.background },
  saveBtn: { backgroundColor: COLORS.primary, padding: 14, borderRadius: RADIUS.md, alignItems: 'center', ...SHADOWS.sm },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Section
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 10 },

  // Transfers list
  transferRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, padding: 13, borderRadius: RADIUS.md, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  transferIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  transferInfo: { flex: 1 },
  transferType: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  transferMeta: { fontSize: 12, color: COLORS.muted },
  transferAmount: { fontSize: 15, fontWeight: '800' },
});
