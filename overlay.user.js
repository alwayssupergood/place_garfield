// ==UserScript==
// @name         Place Garfield (double)
// @namespace    https://elkia.club/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=elkia.club
// @version      0.4
// @description  the sus corner can't withstand us
// @author       Cerx
// @match        https://hot-potato.reddit.com/embed*
// @updateURL    https://github.com/elkiaclub/place_elkia/raw/master/overlay.user.js
// @downloadURL  https://github.com/elkiaclub/place_elkia/raw/master/overlay.user.js
// ==/UserScript==

// author's note: the code is not very optimized
// stole the base for this from https://github.com/itchylol742/voidbotcoords/
(function () {
  'use strict'
  // image stored as base64 to prevent CORS issues
  const blueprint = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAGCAIAAACjN0L0AAABhGlDQ1BJQ0MgcHJvZmlsZQAAKJF9kT1Iw0AcxV/TiiIVBzOIOGSoThZERQUXrUIRKpRaoVUHk0u/oElDkuLiKLgWHPxYrDq4OOvq4CoIgh8gjk5Oii5S4v+SQosYD4778e7e4+4dINTLTLNCo4Cm22YqHpMy2VWp8xUhBCFiBlMys4y5ZDIB3/F1jwBf76I8y//cn6NHzVkMCEjEs8wwbeIN4slN2+C8TyyyoqwSnxOPmHRB4keuKx6/cS64LPBM0Uyn5olFYqnQxkobs6KpEU8QR1RNp3wh47HKeYuzVq6y5j35C8M5fWWZ6zQHEccilpCEBAVVlFCGjSitOikWUrQf8/EPuP4kuRRylcDIsYAKNMiuH/wPfndr5cfHvKRwDOh4cZyPIaBzF2jUHOf72HEaJ0DwGbjSW/5KHZj+JL3W0iJHQO82cHHd0pQ94HIH6H8yZFN2pSBNIZ8H3s/om7JA3y3Qveb11tzH6QOQpq4SN8DBITBcoOx1n3d3tff275lmfz/O/nLMe5NFOQAAAAlwSFlzAAAOwwAADsMBx2+oZAAAAAd0SU1FB+YEAxUDHM49NQYAAACJSURBVBjTfdChDUJBEIThf/aeoANawqFpAAyFUAAYKkCjkPSCogQIt4O4QF4e4UZMNptvzep439rmEwPKyJl5ELGZ7/sg2la13nIHCOSwnkiMzv6BANbXg0uJrG3+9jcdMIxd1DrpSX6BTstLKkQ1AYlIFAij9Oq86IPBFFumPaJg1J4ElBfQB29gM2bAzD9+rgAAAABJRU5ErkJggg=='
  const placementLocation = {
    x: 1543,
    y: 1699,
  }

  // stole the mappings from https://github.com/rdeepak2002/reddit-place-script-2022/blob/main/mappings.py
  const colorMap = new Map([
    ['#BE0039', 1], // dark red
    ['#FF4500', 2], // red
    ['#FFA800', 4], // orange
    ['#FFD635', 3], // yellow
    ['#00A368', 6], // dark green
    ['#00CC78', 7], // green
    ['#7EED56', 8], // light green
    ['#00756F', 9], // dark teal
    ['#009EAA', 10], // teal
    ['#2450A4', 12], // dark blue
    ['#3690EA', 13], // blue
    ['#51E9F4', 14], // light blue
    ['#493AC1', 15], // indigo
    ['#6A5CFF', 16], // periwinkle
    ['#811E9F', 18], // dark purple
    ['#B44AC0', 19], // purple
    ['#FF3881', 22], // pink
    ['#FF99AA', 23], // light pink
    ['#6D482F', 24], // dark brown
    ['#9C6926', 25], // brown
    ['#000000', 27], // black
    ['#898D90', 29], // gray
    ['#D4D7D9', 30], // light gray
    ['#FFFFFF', 31] // white
  ])

  // this does the bulk of the work
  async function runScript (theCanvas) {
    // get shit ready
    console.log('Maintainer starting up...')

    const ui = new UserInterface()
    const place = new PlaceApi(theCanvas)
    const instructions = new Instructions()
    await instructions.loadBlueprint()

    // get a random pixel from the placement
    async function findPlaceToColor () {
      // selects a random pixel within the placement
      while (true) {
        const x = Math.floor(Math.random() * instructions.image.width)
        const y = Math.floor(Math.random() * instructions.image.height)
        ui.displayText(`checking... (${x + placementLocation.x}, ${y + placementLocation.y})`)
        const blueprintColor = instructions.pixelColor(x, y)
        if (blueprintColor !== null) { // skip if the blueprint color is transparent for selected pixel
          const targetColor = instructions.convertPalette(blueprintColor) // todo: precalculate this?
          const canvasColor = place.getPixel(x + placementLocation.x, y + placementLocation.y)
          // if the color on the canvas does not match the color of the blueprint, we have found a location to place a piece
          if (canvasColor !== targetColor) {
            ui.displayText(`tile: ${canvasColor} (${x + placementLocation.x}, ${y + placementLocation.y}) is not matching the blueprint: ${targetColor} (${x}, ${y}) `)
            return {
              x: x + placementLocation.x,
              y: y + placementLocation.y,
              color: targetColor
            }
          }
        }
        // if the colors match, waits a bit and tries again
        await sleep(200) // this also makes sure the code does not hang when the canvas is exactly the same as the blueprint
      }
    }

    let updateCount = 0
    const update = async () => {
      const cooldown = checkCooldown()
      if (!!cooldown && cooldown > 0) {
        ui.displayText(`Cooldown detected. Next tile available in: ${cooldown} seconds.`)

        if (cooldown > 5) { // clear the overlay
          await sleep(5000)
          ui.emptyContainer()
        }
        // wait for cooldown to expire
        await sleep(cooldown * 1000)

      } else {
        // refreshes the page every 10 cycles for good measure
        updateCount++
        if (updateCount >= 10) {
          console.log('Reloading page...')
          location.reload()
          return
        }

        // get a random pixel to color
        const pos = await findPlaceToColor()
        await place.setPixel(pos.x, pos.y, colorMap.get(pos.color))
        ui.displayText(`placed tile: ${pos.color} (${pos.x}, ${pos.y})`)

        // wait 5.5 minutes before trying again
        await sleep(0.1 * 60 * 1000)
        ui.emptyContainer() // clear the text
        await sleep(5.4 * 60 * 1000)
      }
      update()
    }
    // start the update loop
    setTimeout(update, 1000)
  }

  // checks the status (cooldown on tile placement)
  function checkCooldown () {
    const status = document.querySelector('mona-lisa-embed')?.shadowRoot?.querySelector('mona-lisa-status-pill')
    return 0 || parseInt(status?.getAttribute('next-tile-available-in'))
  }

  // waits for the canvas to be loaded
  const isReadyInterval = setInterval(() => {
    const theCanvas = document
      .querySelector('mona-lisa-embed')
      ?.shadowRoot?.querySelector('mona-lisa-camera')
      ?.querySelector('mona-lisa-canvas')
      ?.shadowRoot?.querySelector('canvas')

    if (theCanvas && document.querySelector('mona-lisa-embed')?.shadowRoot?.querySelector('mona-lisa-overlay')?.shadowRoot.children.length === 0) {
      clearInterval(isReadyInterval)
      runScript(theCanvas)
    }
  }, 500)

  // simple access-class for updating the UI
  class UserInterface {
    constructor () {
      this.container = this.prepareContainer()
    }

    prepareContainer () {
      const element = document.createElement('div')
      element.style.display = 'none'
      document.body.prepend(element)
      return element
    }

    emptyContainer () {
      this.container.innerHTML = ''
      this.container.style.cssText = ''
      this.container.style.display = 'none'
    }

    setOverlay () {
      this.container.style.cssText = 'display: flex; align-items: center; justify-content: center; position: absolute; bottom: 0; right: 0; top: 0; left: 0; width: 100%; height: 100%; z-index: 2147483647; background: rgba(0,0,0,.75);'
    }

    parseColors (str) {
      const matchHex = /(#?([a-f\d]{6}))/gi
      return str.replace(matchHex, (s, g0, g1) => `<div style="background: ${g0}; width: 10px; height: 10px; margin: 5px; border: 1px solid rgba(255,255,255,.5)"></div>`)
    }

    displayText (text) {
      this.setOverlay()
      this.container.innerHTML = `
        <div style="color: #fff;
                    padding: 0.75em;
                    text-align: center;
                    font-size: 1.2em;
                    background: rgba(0,0,0,.75);
                    line-height: 1.5em;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    ">
          ${this.parseColors(text)}
        </div>
      `
    }
  }

  // places the blueprint image on the page and allows to read the colors of pixels
  class Instructions {
    constructor () {
      this.image = null
      this.canvas = null
    }

    async loadBlueprint () {
      this.image = await new Promise((resolve, reject) => {
        const imageElement = document.createElement('img')
        imageElement.display = 'none'
        imageElement.src = blueprint
        imageElement.onload = () => resolve(imageElement) // should be instant but just in case
        imageElement.onerror = () => reject(new Error('Image load failed'))
      })

      const canvas = document.createElement('canvas')
      canvas.style.display = 'none'
      canvas.width = this.image.width
      canvas.height = this.image.height
      canvas.getContext('2d').drawImage(this.image, 0, 0, this.image.width, this.image.height)
      this.canvas = canvas
    }

    // returns color of pixel at x,y
    pixelColor (x, y) {
      const data = this.canvas.getContext('2d').getImageData(x, y, 1, 1).data
      // hex value, or null if pixel is transparent
      return data[3] === 0 ? null : rgbToHex(data[0], data[1], data[2])
    }

    // maps the image colors to colorMap
    convertPalette (pixelColor) {
      // the simplest is to take the euclidian distance between the two points in RGB space
      const getDistance = (color1, color2) => {
        const c1 = hexToRgb(color1)
        const c2 = hexToRgb(color2)
        const distance = Math.sqrt(
          Math.pow(c1.r - c2.r, 2) +
            Math.pow(c1.g - c2.g, 2) +
            Math.pow(c1.b - c2.b, 2)
        )
        return distance
      }

      const availableColors = Array.from(colorMap.keys())
      const closestColor = availableColors.reduce((prev, curr) => {
        const distance = getDistance(pixelColor, curr)
        if (distance < getDistance(pixelColor, prev)) {
          return curr
        } else {
          return prev
        }
      })
      return closestColor
    }
  }

  class PlaceApi {
    constructor (canvas) {
      this.canvas = canvas
      this.context = canvas.getContext('2d')
    }

    getPixel (x, y) {
      const data = this.context.getImageData(x, y, 1, 1).data
      return rgbToHex(data[0], data[1], data[2])
    }

    async setPixel (x, y, colorId) {
      this.canvas.dispatchEvent(createEvent('click-canvas', { x, y }))
      await sleep(1000)
      this.canvas.dispatchEvent(createEvent('select-color', { color: colorId }))
      await sleep(1000)
      this.canvas.dispatchEvent(createEvent('confirm-pixel'))
    }
  }

  // utility functions
  function createEvent (e, t) {
    return new CustomEvent(e, {
      composed: !0,
      bubbles: !0,
      cancelable: !0,
      detail: t
    })
  }
  function sleep (ms) {
    return new Promise((response) => setTimeout(response, ms))
  }
  function rgbToHex (r, g, b) {
    const componentToHex = (c) => {
      const hex = c.toString(16)
      return hex.length == 1 ? '0' + hex : hex // adds required zero padding
    }
    return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`.toUpperCase()
  }
  function hexToRgb (hex) {
    const matchHex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i
    const result = matchHex.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : null
  }
  // allows to refference the color ID back to the hex value
  function getColorByID (searchValue) {
    for (const [key, value] of colorMap.entries()) {
      if (value === searchValue) { return key }
    }
  }
})()
