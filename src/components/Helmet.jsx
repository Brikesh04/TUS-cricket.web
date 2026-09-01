import React, { useEffect } from 'react'

// Minimal head manager. Tags this component creates are removed again on
// unmount, and tags it merely overwrote are restored to their previous value.
// Without that, values leak across routes: Home sets og:title/og:image, then
// /contact (which sets no og: tags at all) keeps advertising the Home page.
//
// Elements are marked data-helmet so we only ever clean up our own, never the
// static tags that ship in index.html.
export const Helmet = ({ children }) => {
  useEffect(() => {
    const kids = React.Children.toArray(children)
    const previousTitle = document.title
    // Cleanup steps, collected as we go and run in reverse on unmount.
    const undo = []

    const titleElement = kids.find(child => child.type === 'title')
    if (titleElement && typeof titleElement.props.children === 'string') {
      document.title = titleElement.props.children
      undo.push(() => { document.title = previousTitle })
    }

    const upsert = (selector, create, attr, value) => {
      if (value == null) return
      let el = document.querySelector(selector)
      if (el) {
        // Pre-existing tag: remember what it said and put it back later.
        const previous = el.getAttribute(attr)
        el.setAttribute(attr, value)
        undo.push(() => {
          if (previous === null) el.removeAttribute(attr)
          else el.setAttribute(attr, previous)
        })
      } else {
        el = create()
        el.setAttribute('data-helmet', '')
        el.setAttribute(attr, value)
        document.head.appendChild(el)
        undo.push(() => el.remove())
      }
    }

    kids
      .filter(child => child.type === 'meta')
      .forEach(({ props: { name, content, property } }) => {
        if (name) {
          upsert(
            `meta[name="${name}"]`,
            () => { const m = document.createElement('meta'); m.setAttribute('name', name); return m },
            'content',
            content
          )
        } else if (property) {
          upsert(
            `meta[property="${property}"]`,
            () => { const m = document.createElement('meta'); m.setAttribute('property', property); return m },
            'content',
            content
          )
        }
      })

    const linkElement = kids.find(
      child => child.type === 'link' && child.props.rel === 'canonical'
    )
    if (linkElement?.props.href) {
      upsert(
        'link[rel="canonical"]',
        () => { const l = document.createElement('link'); l.setAttribute('rel', 'canonical'); return l },
        'href',
        linkElement.props.href
      )
    }

    return () => {
      // Reverse order so overlapping writes unwind cleanly.
      for (let i = undo.length - 1; i >= 0; i--) undo[i]()
    }
  }, [children])

  return null
}

export default Helmet
