import React from 'react'
import Chart from 'react-apexcharts'
import { compactDuration } from '../lib/format.js'

const FONT = 'Inter Tight, -apple-system, BlinkMacSystemFont, sans-serif'
const SIGNAL = '#e8552b'

function palette() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark'
  return dark
    ? { line: '#2b2924', muted: '#a49e92', markerStroke: '#1a1815' }
    : { line: '#e7e3da', muted: '#6f6a61', markerStroke: '#ffffff' }
}

export default function AreaChart({ data, format = (v) => String(v), height = 210, name = 'Time inside' }) {
  const pal = palette()
  const h = window.innerWidth <= 640 ? Math.round(height * 0.78) : height
  const series = [{ name, data: data.map((d) => Math.round(d.value)) }]
  const markerSize = data.length > 1 && data.length <= 8 ? 4.5 : 0

  const options = {
    chart: {
      type: 'area',
      height: h,
      fontFamily: FONT,
      foreColor: pal.muted,
      background: 'transparent',
      animations: { enabled: false },
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: [SIGNAL],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2.5 },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05, stops: [0, 90, 100] },
    },
    markers: { size: markerSize, strokeWidth: 2, strokeColors: pal.markerStroke, hover: { size: 6 } },
    grid: {
      borderColor: pal.line,
      strokeDashArray: 0,
      padding: { left: 6, right: 6, top: 0 },
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    xaxis: {
      categories: data.map((d) => d.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
      labels: {
        show: true,
        rotate: 0,
        trim: true,
        hideOverlappingLabels: true,
        style: { fontSize: '11px', fontFamily: FONT, colors: [pal.muted] },
      },
    },
    yaxis: {
      labels: {
        show: true,
        formatter: compactDuration,
        style: { fontSize: '11px', fontFamily: FONT, colors: [pal.muted] },
      },
    },
    tooltip: {
      enabled: true,
      theme: 'light',
      y: { formatter: (val) => format(val) },
    },
  }

  return <Chart type="area" series={series} options={options} height={h} width="100%" />
}
