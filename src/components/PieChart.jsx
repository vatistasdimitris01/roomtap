import React from 'react'
import Chart from 'react-apexcharts'

const FONT = 'Inter Tight, -apple-system, BlinkMacSystemFont, sans-serif'

function palette() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark'
  return dark
    ? { paper: '#131211', ink: '#f2efe8', muted: '#a49e92' }
    : { paper: '#fbfbf9', ink: '#14120f', muted: '#6f6a61' }
}

export default function PieChart({ data, format = (v) => String(v), height = 240 }) {
  const pal = palette()
  const h = window.innerWidth <= 640 ? Math.round(height * 0.8) : height
  const total = data.reduce((s, d) => s + d.value, 0)
  const active = data.filter((d) => d.value > 0)
  const series = active.map((d) => d.value)
  const labels = active.map((d) => d.label)
  const colors = active.map((d) => d.color)

  const options = {
    chart: {
      type: 'donut',
      height: h,
      fontFamily: FONT,
      foreColor: pal.muted,
      background: 'transparent',
      animations: { enabled: false },
      toolbar: { show: false },
    },
    colors,
    labels,
    dataLabels: { enabled: false },
    stroke: { width: 2, colors: [pal.paper] },
    plotOptions: {
      pie: {
        donut: {
          size: '74%',
          labels: {
            show: true,
            name: { show: true, fontSize: '13px', fontFamily: FONT, color: pal.muted, offsetY: -8 },
            value: {
              show: true,
              fontSize: '24px',
              fontFamily: 'Fraunces, Georgia, serif',
              fontWeight: 600,
              color: pal.ink,
              offsetY: 10,
              formatter: (val) => format(Number(val)),
            },
            total: {
              show: true,
              showAlways: true,
              label: 'Total inside',
              fontSize: '13px',
              fontFamily: FONT,
              color: pal.muted,
              formatter: (w) => format(w.globals.seriesTotals.reduce((a, b) => a + b, 0)),
            },
          },
        },
      },
    },
    tooltip: {
      enabled: true,
      theme: 'light',
      y: { formatter: (val) => format(val) },
    },
    legend: { show: false },
  }

  const legend = (
    <ul className="donut-legend">
      {data.map((d, i) => (
        <li key={i}>
          <span className="sw" style={{ background: d.color }} />
          <span className="lb">{d.label}</span>
          <span className="vl">
            {format(d.value)}
            {total > 0 ? ` · ${Math.round((d.value / total) * 100)}%` : ''}
          </span>
        </li>
      ))}
    </ul>
  )

  if (!total) {
    return (
      <div className="donut">
        <div className="pie-empty" aria-label="empty donut chart">
          <span className="pie-empty-total">{format(0)}</span>
          <span className="pie-empty-sub">total inside</span>
        </div>
        {legend}
      </div>
    )
  }

  return (
    <div className="donut">
      <Chart type="donut" series={series} options={options} height={h} width="100%" />
      {legend}
    </div>
  )
}
