import React, { useEffect } from 'react'

export const Helmet = ({ children }) => {
  useEffect(() => {
    // 1. Update Title
    const titleElement = React.Children.toArray(children).find(
      child => child.type === 'title'
    )
    if (titleElement && typeof titleElement.props.children === 'string') {
      document.title = titleElement.props.children
    }

    // 2. Update Meta Tags (description, keywords, open-graph, twitter)
    const metaElements = React.Children.toArray(children).filter(
      child => child.type === 'meta'
    )
    
    metaElements.forEach(meta => {
      const { name, content, property } = meta.props
      if (name) {
        let el = document.querySelector(`meta[name="${name}"]`)
        if (!el) {
          el = document.createElement('meta')
          el.setAttribute('name', name)
          document.head.appendChild(el)
        }
        el.setAttribute('content', content)
      } else if (property) {
        let el = document.querySelector(`meta[property="${property}"]`)
        if (!el) {
          el = document.createElement('meta')
          el.setAttribute('property', property)
          document.head.appendChild(el)
        }
        el.setAttribute('content', content)
      }
    })

    // 3. Update Canonical Links
    const linkElement = React.Children.toArray(children).find(
      child => child.type === 'link' && child.props.rel === 'canonical'
    )
    if (linkElement && linkElement.props.href) {
      let el = document.querySelector('link[rel="canonical"]')
      if (!el) {
        el = document.createElement('link')
        el.setAttribute('rel', 'canonical')
        document.head.appendChild(el)
      }
      el.setAttribute('href', linkElement.props.href)
    }
  }, [children])

  return null
}

export default Helmet
