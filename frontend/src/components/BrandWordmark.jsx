const WORDMARK = '3\u00a0\u00a0S T R A N D S\u00a0\u00a0C A T T L E\u00a0\u00a0CO.'

function BrandWordmark({ as: Component = 'span', className = '' }) {
  return (
    <Component className={`brand-wordmark ${className}`.trim()} aria-label="3 Strands Cattle Co.">
      {WORDMARK}
    </Component>
  )
}

export default BrandWordmark
