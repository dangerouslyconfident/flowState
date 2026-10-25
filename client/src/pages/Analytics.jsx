import { useState, useEffect } from 'react';
import { analyticsApi, aiApi } from '../utils/api';
import { useToast } from '../context/ToastContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import {
  HiOutlineChartBar,
  HiOutlineSparkles,
  HiOutlineFire,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineTrendingUp,
  HiOutlineRefresh,
  HiOutlineShieldCheck,
  HiOutlineLightningBolt
} from 'react-icons/hi';

const CATEGORY_COLORS = [
  '#6C63FF',
  '#00D4FF',
  '#34D399',
  '#FBBF24',
  '#F87171',
  '#A855F7',
  '#EC4899',
  '#3B82F6'
];

export default function Analytics() {
  const { addToast } = useToast();
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [categories, setCategories] = useState([]);
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0 });
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [overviewRes, trendsRes, catsRes, streakRes] = await Promise.all([
        analyticsApi.overview().catch(() => ({ overview: null })),
        analyticsApi.trends(days).catch(() => ({ trends: [] })),
        analyticsApi.categories().catch(() => ({ categories: [] })),
        analyticsApi.streak().catch(() => ({ currentStreak: 0, longestStreak: 0 }))
      ]);

      if (overviewRes?.overview) setOverview(overviewRes.overview);
      if (trendsRes?.trends) setTrends(trendsRes.trends);
      if (catsRes?.categories) setCategories(catsRes.categories);
      if (streakRes) setStreak(streakRes);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      addToast('Failed to load some analytics data', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [days]);

  const handleGenerateAiInsights = async () => {
    try {
      setAiLoading(true);
      const res = await aiApi.insights();
      if (res?.insights) {
        setAiInsights(res.insights);
        addToast('AI Productivity Insights generated!', 'success');
      } else {
        addToast('No insights could be generated yet. Log more activity first!', 'info');
      }
    } catch (err) {
      console.error('AI insights error:', err);
      addToast(err.message || 'Failed to generate AI insights', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  // Format short date for charts (e.g., 'Oct 14')
  const formatChartDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const chartData = trends.map(t => ({
    ...t,
    displayDate: formatChartDate(t.date)
  }));

  const pieData = categories.map(c => ({
    name: c.name || 'General',
    value: c.total || 0,
    completed: c.completed || 0
  })).filter(c => c.value > 0);

  const totalFocusHours = overview?.focus?.weekMinutes 
    ? (overview.focus.weekMinutes / 60).toFixed(1)
    : '0';

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>
            <span className="text-gradient">Productivity</span> Analytics
          </h1>
          <p className="text-secondary" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
            Track focus patterns, completion velocity, and AI-driven growth metrics.
          </p>
        </div>
        <div className="page-actions">
          <div style={{ display: 'flex', background: 'var(--glass-bg)', borderRadius: 'var(--radius-md)', padding: '4px', border: '1px solid var(--glass-border)' }}>
            {[7, 14, 30].map(d => (
              <button
                key={d}
                className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '6px 14px' }}
                onClick={() => setDays(d)}
              >
                {d} Days
              </button>
            ))}
          </div>
          <button className="btn btn-secondary btn-icon" onClick={fetchData} title="Refresh metrics">
            <HiOutlineRefresh />
          </button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(108, 99, 255, 0.15)', color: 'var(--accent-primary)' }}>
            <HiOutlineFire />
          </div>
          <div className="stat-value">{streak.currentStreak || 0} <span style={{ fontSize: '1rem', fontWeight: 400 }}>days</span></div>
          <div className="stat-label">Active Streak (Best: {streak.longestStreak || 0}d)</div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(0, 212, 255, 0.15)', color: 'var(--accent-secondary)' }}>
            <HiOutlineClock />
          </div>
          <div className="stat-value">{totalFocusHours} <span style={{ fontSize: '1rem', fontWeight: 400 }}>hrs</span></div>
          <div className="stat-label">Focus Time This Week</div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8' }}>
            <HiOutlineLightningBolt />
          </div>
          <div className="stat-value">
            {overview?.dailyQuota?.complianceRate || 0}%
          </div>
          <div className="stat-label">
            Daily Quota Adherence ({overview?.dailyQuota?.loggedMinutes || 0}/{overview?.dailyQuota?.allocatedMinutes || 0}m)
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#F87171' }}>
            <HiOutlineShieldCheck />
          </div>
          <div className="stat-value">
            {overview?.distractions?.resistanceScore !== undefined ? overview.distractions.resistanceScore : 100}%
          </div>
          <div className="stat-label">
            Distraction Shield ({overview?.distractions?.totalBlocked || 0} Thwarted)
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(52, 211, 153, 0.15)', color: 'var(--success)' }}>
            <HiOutlineCheckCircle />
          </div>
          <div className="stat-value">{overview?.tasks?.completionRate ?? 0}%</div>
          <div className="stat-label">{overview?.tasks?.completed || 0} of {overview?.tasks?.total || 0} Tasks Done</div>
        </div>
      </div>

      {/* AI Productivity Coach Section */}
      <div className="glass-card" style={{ marginBottom: 'var(--space-xl)', border: '1px solid rgba(108, 99, 255, 0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <HiOutlineSparkles />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', margin: 0 }}>FlowState AI Coach</h2>
              <p className="text-secondary" style={{ fontSize: '0.8rem', margin: 0 }}>
                Synthesizing your habits and focus patterns via Google Gemini
              </p>
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleGenerateAiInsights}
            disabled={aiLoading}
          >
            {aiLoading ? (
              <>
                <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                Analyzing Flow...
              </>
            ) : (
              <>
                <HiOutlineSparkles />
                Generate Fresh Insights
              </>
            )}
          </button>
        </div>

        {aiInsights && aiInsights.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
            {aiInsights.map((insight, idx) => (
              <div key={idx} className="insight-card">
                <span className="insight-icon">{insight.icon || '💡'}</span>
                <div className="insight-content">
                  <div className="insight-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {insight.title}
                    {insight.type === 'achievement' && <span className="badge badge-success">Win</span>}
                    {insight.type === 'warning' && <span className="badge badge-warning">Watch</span>}
                    {insight.type === 'suggestion' && <span className="badge badge-info">Tip</span>}
                  </div>
                  <div className="insight-desc">{insight.description}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 'var(--space-md)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Click <strong>Generate Fresh Insights</strong> to have Gemini analyze your recent task completions and focus intervals.
          </div>
        )}
      </div>

      {/* Main Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 'var(--space-xl)' }}>
        {/* Trend Area Chart */}
        <div className="glass-card chart-container">
          <div className="chart-header">
            <div>
              <div className="chart-title">Focus Minutes & Activity</div>
              <p className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                Daily focus volume over the last {days} days
              </p>
            </div>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6C63FF" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="taskGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#00D4FF" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="displayDate"
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={11}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(12, 12, 29, 0.95)',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                      backdropFilter: 'blur(10px)'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="focusMinutes"
                    name="Focus (min)"
                    stroke="#6C63FF"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#focusGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="tasksCompleted"
                    name="Tasks Completed"
                    stroke="#00D4FF"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#taskGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
                <span className="empty-title">No activity recorded</span>
                <span className="empty-desc">Complete a focus session or task to see trends</span>
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown Donut / Pie */}
        <div className="glass-card chart-container">
          <div className="chart-header">
            <div>
              <div className="chart-title">Tasks by Category</div>
              <p className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                Distribution across your key project domains
              </p>
            </div>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(12, 12, 29, 0.95)',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
                <span className="empty-title">No categories categorized</span>
                <span className="empty-desc">Create tasks with categories to see breakdown</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
