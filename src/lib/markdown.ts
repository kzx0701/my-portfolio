import MarkdownIt from 'markdown-it'

/**
 * Markdown 渲染单例（知识库笔记正文）
 * - html: false：禁止原生 HTML，防注入（笔记内容仅本用户可见，仍保持默认安全）
 * - linkify: true：裸链接自动转 <a>
 * - breaks: true：换行即 <br>（笔记场景更接近所见即所得）
 * 代码块暂不做语法高亮（保持轻量），由全局样式提供暗底代码块观感
 */
const md = new MarkdownIt({ html: false, linkify: true, breaks: true })

export function renderMarkdown(content: string): string {
  return md.render(content)
}
