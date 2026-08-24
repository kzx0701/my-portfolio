import type * as EChartsCore from 'echarts/core'

let loader: Promise<typeof EChartsCore> | null = null

/** 页面框架先渲染，图表运行时在组件挂载后再并行加载。 */
export function loadECharts(): Promise<typeof EChartsCore> {
  if (loader) return loader
  loader = Promise.all([
    import('echarts/core'),
    import('echarts/charts'),
    import('echarts/components'),
    import('echarts/renderers'),
  ]).then(([core, charts, components, renderers]) => {
    core.use([
      charts.BarChart,
      charts.LineChart,
      charts.PieChart,
      components.GridComponent,
      components.LegendComponent,
      components.TooltipComponent,
      renderers.CanvasRenderer,
    ])
    return core
  })
  return loader
}
