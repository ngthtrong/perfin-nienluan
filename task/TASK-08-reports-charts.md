# TASK-08: Báo cáo & Biểu đồ

| Thuộc tính | Giá trị |
|-----------|---------|
| **Task ID** | TASK-08 |
| **Phase** | 3 — Budget & Reports |
| **Ưu tiên** | 🟡 High |
| **Trạng thái** | ⬜ TODO |
| **Phụ thuộc** | TASK-01, TASK-02, TASK-04, TASK-05 |
| **Ước lượng** | 6-8 giờ |

---

## 📋 Tổng quan

Cung cấp báo cáo trực quan cho người dùng: tổng hợp thu/chi theo tháng, biểu đồ tròn chi tiêu theo danh mục, biểu đồ cột xu hướng 12 tháng, top danh mục chi tiêu. Báo cáo phải dễ đọc và load nhanh (< 2 giây).

## 📌 Điều kiện tiên quyết

- TASK-05 (transactions CRUD + aggregation queries)
- TASK-04 (categories system)

---

## 📝 Chi tiết các Subtask

### 8.1: Implement report.service.js
- [ ] `getMonthlySummary(userId, month, year)`:

```javascript
// Returns: { totalIncome, totalExpense, net, transactionCount }
const result = await pool.query(`
  SELECT
    COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as total_income,
    COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as total_expense,
    COUNT(*) as transaction_count
  FROM transactions
  WHERE user_id = $1
    AND EXTRACT(MONTH FROM transaction_date) = $2
    AND EXTRACT(YEAR FROM transaction_date) = $3
    AND deleted_at IS NULL
`, [userId, month, year]);
// Thêm: net = total_income - total_expense
```

- [ ] `getCategoryBreakdown(userId, month, year)`:

```javascript
// Returns: [{ category_id, category_name, icon, total, percentage, count }]
// Chỉ tính expense (chi tiêu)
// Sắp xếp theo total DESC
// Tính percentage = (total / tổng chi) * 100
// Group nhỏ < 3% vào "Khác" (cho biểu đồ tròn gọn)
```

- [ ] `getMonthlyTrend(userId, year)`:

```javascript
// Returns: [{ month: 1, month_name: 'T1', income, expense, net }] x 12 tháng
const result = await pool.query(`
  SELECT
    EXTRACT(MONTH FROM transaction_date) as month,
    COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as income,
    COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expense
  FROM transactions
  WHERE user_id = $1
    AND EXTRACT(YEAR FROM transaction_date) = $2
    AND deleted_at IS NULL
  GROUP BY EXTRACT(MONTH FROM transaction_date)
  ORDER BY month
`, [userId, year]);
// Fill missing months with 0
```

- [ ] `getTopCategories(userId, month, year, limit = 5)`:

```javascript
// Returns: top N expense categories theo total spending
// Include: category_name, icon, total, percentage, count
```

### 8.2: Implement report.routes.js
- [ ] `GET /api/reports/summary`

```
Query: ?month=6&year=2026
Response: {
  success: true,
  data: {
    total_income: 15000000,
    total_expense: 8500000,
    net: 6500000,
    transaction_count: 45
  }
}
```

- [ ] `GET /api/reports/category-breakdown`

```
Query: ?month=6&year=2026
Response: {
  success: true,
  data: [
    { category_name: "Ăn uống", icon: "🍜", total: 3000000, percentage: 35.3, count: 20 },
    { category_name: "Di chuyển", icon: "🚗", total: 1500000, percentage: 17.6, count: 8 },
    ...
  ]
}
```

- [ ] `GET /api/reports/monthly-trend`

```
Query: ?year=2026
Response: {
  success: true,
  data: [
    { month: 1, month_name: "T1", income: 15000000, expense: 12000000, net: 3000000 },
    { month: 2, month_name: "T2", income: 15000000, expense: 10000000, net: 5000000 },
    ...
  ]
}
```

- [ ] `GET /api/reports/top-categories`

```
Query: ?month=6&year=2026&limit=5
Response: { success: true, data: [...top 5 categories] }
```

### 8.3: Install chart library
- [ ] Cài đặt trong frontend:

```bash
npx expo install react-native-chart-kit react-native-svg
```

- [ ] Test: render 1 chart đơn giản để verify library hoạt động
- [ ] Alternative nếu chart-kit có vấn đề: `victory-native`

### 8.4: Frontend — ReportScreen.js
- [ ] **Period selector**:

```
    ◀  Tháng 6, 2026  ▶
```

- [ ] **Summary card**:

```
┌──────────────────────────────────┐
│  Thu nhập       Chi tiêu         │
│  +15.000.000₫   -8.500.000₫     │
│                                  │
│  Chênh lệch: +6.500.000₫ 📈    │
│  45 giao dịch                    │
└──────────────────────────────────┘
```

- [ ] **Biểu đồ tròn (Pie Chart)** — Chi tiêu theo danh mục:
  - Mỗi segment có màu riêng (từ color palette)
  - Legend bên dưới: icon + tên + percentage + amount
  - Categories < 3% gộp vào "Khác"
  - Tap segment → highlight + show detail

- [ ] **Biểu đồ cột (Bar Chart)** — Xu hướng 12 tháng:
  - 2 bars per month: Thu (xanh) vs Chi (đỏ)
  - X-axis: T1, T2, ..., T12
  - Y-axis: auto-scale
  - Scrollable horizontally nếu không đủ chỗ
  - Tháng hiện tại highlighted

- [ ] **Top 5 danh mục**:

```
1. 🍜 Ăn uống      3.000.000₫  ████████████  35%
2. 🚗 Di chuyển    1.500.000₫  ██████        18%
3. 🎮 Giải trí     1.200.000₫  █████         14%
4. 📚 Giáo dục       800.000₫  ███            9%
5. 🏠 Nhà cửa        700.000₫  ███            8%
```

- [ ] **ScrollView** để cuộn toàn bộ nội dung

### 8.5: Frontend — Chart components
- [ ] `components/CategoryPieChart.js`:

```javascript
import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

export default function CategoryPieChart({ data }) {
  const chartData = data.map((item, i) => ({
    name: item.category_name,
    population: item.total,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    legendFontColor: '#7F7F7F',
    legendFontSize: 12,
  }));

  return (
    <PieChart
      data={chartData}
      width={Dimensions.get('window').width - 32}
      height={220}
      chartConfig={{ /* ... */ }}
      accessor="population"
      backgroundColor="transparent"
      paddingLeft="15"
      absolute // show absolute values
    />
  );
}
```

- [ ] `components/MonthlyTrendBarChart.js`:

```javascript
import { BarChart } from 'react-native-chart-kit';

export default function MonthlyTrendBarChart({ data }) {
  const chartData = {
    labels: data.map(d => d.month_name),
    datasets: [
      { data: data.map(d => d.income), color: () => '#4CAF50' },
      { data: data.map(d => d.expense), color: () => '#F44336' },
    ],
    legend: ['Thu nhập', 'Chi tiêu'],
  };

  return (
    <BarChart
      data={chartData}
      width={Dimensions.get('window').width - 32}
      height={250}
      chartConfig={{ /* ... */ }}
      verticalLabelRotation={0}
      fromZero
    />
  );
}
```

- [ ] Handle empty data: hiển thị "Chưa có dữ liệu" illustration
- [ ] Responsive: chart width dựa trên `Dimensions.get('window').width`

### 8.6: Category color mapping
- [ ] Định nghĩa trong `constants.js`:

```javascript
export const CATEGORY_COLORS = {
  'Ăn uống': '#FF6384',
  'Di chuyển': '#36A2EB',
  'Mua sắm': '#FFCE56',
  'Giải trí': '#4BC0C0',
  'Sức khỏe': '#9966FF',
  'Giáo dục': '#FF9F40',
  'Nhà cửa': '#C9CBCF',
  'Hóa đơn & Dịch vụ': '#7C4DFF',
  'Tạp hóa': '#00BCD4',
  'Điện tử': '#607D8B',
  'Thể thao': '#8BC34A',
  'Làm đẹp': '#E91E63',
  'Khác': '#9E9E9E',
  // Income
  'Lương': '#4CAF50',
  'Thưởng': '#8BC34A',
  'Đầu tư': '#009688',
};
```

- [ ] Dùng nhất quán trong pie chart, progress bars, transaction list icons

---

## ✅ Tiêu chí hoàn thành

- [ ] Report API trả về dữ liệu aggregated chính xác
- [ ] Monthly summary đúng (total income, expense, net, count)
- [ ] Category breakdown tính đúng percentage
- [ ] Monthly trend có đủ 12 tháng (fill 0 cho tháng trống)
- [ ] Pie chart render đúng, readable trên màn hình 5"
- [ ] Bar chart render đúng, scrollable nếu cần
- [ ] Top categories list hiển thị đúng thứ tự
- [ ] Reports load < 2 giây
- [ ] Empty state khi chưa có data

---

## 📝 Ghi chú Kỹ thuật

- **react-native-chart-kit**: Lightweight, dễ dùng, đủ cho MVP. Nếu cần chart phức tạp hơn ở v2+, chuyển sang `victory-native` hoặc `react-native-gifted-charts`
- **SVG dependency**: `react-native-chart-kit` cần `react-native-svg`. Cài qua `npx expo install` để đảm bảo compatible version
- **Query performance**: Aggregation queries trên PostgreSQL đủ nhanh cho MVP (< 100ms với < 10.000 transactions). Thêm composite index `(user_id, transaction_date, type)` nếu chậm
- **Month fill**: API phải trả về đủ 12 tháng cho bar chart, kể cả tháng không có data (fill 0). Logic fill ở backend, không ở frontend
- **Color palette**: 13 màu cho expense categories. Dùng bảng màu tương phản nhau để biểu đồ tròn dễ phân biệt
