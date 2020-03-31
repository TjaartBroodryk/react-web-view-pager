import { Configuration } from './configuration';

const easeInOutQuad = (t: number): number => {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

const TIMEOUT_DEFAULT = 100
const DURATION_DEFAULT = 300
const EASING_DEFAULT = easeInOutQuad
const NOOP = () => { }

interface SnapLength {
  value: number
  unit: string
}

interface SnapCoord {
  x: SnapLength
}

interface Coords {
  x?: number
}

export default class Pager {
  private timeout?: number = null;
  private duration?: number = null;
  private animating = false
  private easing?: (t: number) => number = null
  private offset?: number = null
  private listenerElement?: HTMLElement | Window = null
  private target?: HTMLElement = null
  private onAnimationEnd?: (currentItem: number) => void = null
  private scrollHandlerTimer?: number = null
  private scrollSpeedTimer?: number = null
  private scrollStart?: Coords = null
  private speedDeltaX?: number = null
  private snapLengthUnit: SnapCoord = {
    x: {
      value: 100,
      unit: '%'
    }
  }
  private lastScrollValue: Coords = {
    x: 0,
  }
  private animationFrame?: number = null

  constructor(element: HTMLElement, config: Configuration, callback?: (currentItem: number) => void) {
    if (config.timeout && (isNaN(config.timeout) || typeof config.timeout === 'boolean')) {
      throw new Error(
        `Optional config property 'timeout' is not valid, expected NUMBER but found ${(typeof config.timeout).toUpperCase()}`
      )
    }
    this.timeout = config.timeout || TIMEOUT_DEFAULT

    if (config.duration && (isNaN(config.duration) || typeof config.duration === 'boolean')) {
      throw new Error(
        `Optional config property 'duration' is not valid, expected NUMBER but found ${(typeof config.duration).toUpperCase()}`
      )
    }
    this.duration = config.duration || DURATION_DEFAULT

    if (config.easing && typeof config.easing !== 'function') {
      throw new Error(
        `Optional config property 'easing' is not valid, expected FUNCTION but found ${(typeof config.easing).toUpperCase()}`
      )
    }
    this.easing = config.easing || EASING_DEFAULT

    if (typeof config.offset == 'number') {
      this.offset = Number(config.offset);
    }
    else if (String(config.offset)?.includes('rem')) {
      const value = Number(String(config.offset)?.replace('rem', ''));

      if (!isNaN(value)) {
        this.offset = this.convertRemToPixels(value)
      }
      else {
        throw new Error(`Optional config property 'offset' is not valid, expected valid css rem STRING`)
      }
    }
    else if (config.offset?.includes('px')) {
      const value = Number(config.offset.replace('px', ''));

      if (!isNaN(value)) {
        this.offset = value;
      }
      else {
        throw new Error(`Optional config property 'offset' is not valid, expected valid css px STRING`)
      }
    }
    this.onAnimationEnd = typeof callback === 'function' ? callback : NOOP
    this.bindElement(element)
  }

  private checkScrollSpeed = (value: number, axis: 'x') => {
    const clear = () => {
      this.lastScrollValue![axis] = undefined
    }

    const newValue = value
    let delta: number
    if (this.lastScrollValue[axis] !== null) {
      delta = newValue - this.lastScrollValue[axis]!
    } else {
      delta = 0
    }
    this.lastScrollValue[axis] = newValue
    this.scrollSpeedTimer && clearTimeout(this.scrollSpeedTimer)
    this.scrollSpeedTimer = window.setTimeout(clear, 100)
    return delta
  }

  private bindElement = (element: HTMLElement) => {
    this.target = element
    this.listenerElement = element === document.documentElement ? window : element

    this.listenerElement.addEventListener('scroll', this.startAnimation, false)
  }

  private startAnimation = () => {
    this.speedDeltaX = this.checkScrollSpeed(this.target!.scrollLeft, 'x')

    if (this.animating || this.speedDeltaX === 0) {
      return
    }

    this.handler(this.target!)
  }

  /**
   * scroll handler
   * this is the callback for scroll events.
   */
  private handler = (target: HTMLElement) => {
    // if currently this.animating, stop it. this prevents flickering.
    if (this.animationFrame) {
      clearTimeout(this.animationFrame)
    }

    // if a previous timeout exists, clear it.
    if (this.scrollHandlerTimer) {
      // we only want to call a timeout once after scrolling..
      clearTimeout(this.scrollHandlerTimer)
    } else {
      this.scrollStart = {
        x: target.scrollLeft,
      }
    }

    this.scrollHandlerTimer = window.setTimeout(this.animationHandler, this.timeout)
  }

  /**
   * Responsible for handling the "lifecycle" of the animation
   */
  private animationHandler = async () => {
    // if we don't move a thing, we can ignore the timeout: if we did, there'd be another timeout added for this.scrollStart+1.
    if (this.scrollStart?.x === this.target?.scrollLeft) {
      // ignore timeout
      return
    }

    // detect direction of scroll. negative is up, positive is down.
    const direction = {
      x: this.speedDeltaX! > 0 ? 1 : -1,
    }

    // get the next snap-point to snap-to
    const snapPoint = this.getNextSnapPoint(this.target!, direction)

    this.listenerElement?.removeEventListener('scroll', this.startAnimation, false)

    this.animating = true

    // smoothly move to the snap point
    await this.smoothScroll(this.target!, snapPoint);
    this.animating = false
    this.listenerElement?.addEventListener('scroll', this.startAnimation, false)
    this.onAnimationEnd!(this.calculateCurrentIndex())

    // we just jumped to the snapPoint, so this will be our next this.scrollStart
    if (!isNaN(snapPoint.x)) {
      this.scrollStart = snapPoint
    }
  }

  /**
   * Calculates which "Page" is currently visible
   */
  private calculateCurrentIndex = (): number => {
    const width = this.getPagerWidth();
    const x = this.target!.scrollLeft + width;
    return (Math.round(x / width) - 1)
  }

  /**
   * Get the width of the viewpager element
   */
  private getPagerWidth = (): number => {
    return Math.round(this.getXSnapLength(this.target!, this.snapLengthUnit!.x));
  }

  private getNextSnapPoint = (scrollView: HTMLElement, direction: Coords): Coords => {
    // get snap length
    const snapLength = {
      x: Math.round(this.getXSnapLength(this.target!, this.snapLengthUnit!.x)),
    }
    const left = this.target!.scrollLeft

    // calc current and initial snappoint
    const currentPoint = {
      x: left / snapLength.x || 1,
    }
    const nextPoint = {
      x: 0,
    }

    // set target and bounds by direction
    nextPoint.x = this.roundByDirection(direction.x!, currentPoint.x)

    // calculate where to scroll
    const scrollTo = {
      x: nextPoint.x * snapLength.x,
    }

    // stay in bounds (minimum: 0, maxmimum: absolute height)
    scrollTo.x = this.stayInBounds(0, scrollView.scrollWidth, scrollTo.x)

    return scrollTo
  }

  private roundByDirection = (direction: number, currentPoint: number) => {
    if (direction === -1) {
      // when we go up, we floor the number to jump to the next snap-point in scroll direction
      return Math.floor(currentPoint)
    }
    // go down, we ceil the number to jump to the next in view.
    return Math.ceil(currentPoint)
  }

  private stayInBounds = (min: number, max: number, destined: number) => {
    return Math.max(Math.min(destined, max), min)
  }

  /**
   * Calculate the number of pixels needed to move, in order to scroll the next "page" into view
   * @param scrollView 
   * @param declaration 
   */
  private getXSnapLength = (scrollView: HTMLElement, declaration: SnapLength) => {
    const offset = ((this.offset ?? 0) / 100)
    if (declaration.unit === 'vw') {
      // when using vw, one snap is the length of vw / 100 * value
      const width = (Math.max(document.documentElement.clientWidth, window.innerWidth || 1) / 100) + offset;
      return width * declaration.value
    } else if (declaration.unit === '%') {
      // when using %, one snap is the length of element width / 100 * value
      const width = (scrollView.clientWidth / 100) + offset;
      return width * declaration.value
    } else {
      // when using px, one snap is the length of element width / value
      const width = scrollView.clientWidth + offset;
      return width / declaration.value
    }
  }

  /**
   * Check when scroll coordinated is at the "edge" for the scrollview
   * @param coords current coordinates
   */
  private isEdge = (coords: Coords) => {
    return (coords.x === 0 && this.speedDeltaX === 0)
  }

  /**
   * Smoothly scroll to a position in the scroll view
   * @param scrollView 
   * @param end the desired end coordinates
   * @param callback called once the smooth scroll animation is finished
   */
  private smoothScroll = async (scrollView: HTMLElement, end: Coords): Promise<Coords> => {
    const position = (start: number, end: number, elapsed: number, duration: number) => {
      if (elapsed > duration) {
        return end
      }

      return start + (end - start) * this.easing!(elapsed / duration)
    }

    const start = {
      x: scrollView.scrollLeft,
    }

    // get animation frame or a fallback
    const duration = this.isEdge(start) ? 0 : this.duration
    let startTime: number

    const step = async (timestamp: number): Promise<Coords> => {
      if (!startTime) {
        startTime = timestamp
      }
      const elapsed = timestamp - startTime

      // change position on x-axis if result is a number.
      if (!isNaN(end.x!)) {
        scrollView.scrollLeft = position(start.x, end.x!, elapsed, duration!)
      }

      // check if we are over due;
      if (elapsed < duration!) {
        const timestamp: number = await this.nextFrame();
        await step(timestamp);
      } else {
        // stop execution and run the callback
        return new Promise(resolve => {
          resolve(end);
        })
      }
    }

    const timestamp: number = await this.nextFrame();
    return await step(timestamp);
  }

  private nextFrame = (): Promise<number> => {
    const requestAnimationFrame =
      window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      function (fn) {
        return window.setTimeout(fn, 15)
      }
    return new Promise<number>(resolve => {
      this.animationFrame = requestAnimationFrame(resolve)
    });
  }

  /**
   * Converts a rem value to a px value
   * @param rem
   */
  private convertRemToPixels = (rem: number) => {
    return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
  }

  /**
   * Removes the scroll listener
   */
  unbind = (): void => {
    this.listenerElement?.removeEventListener('scroll', this.startAnimation, false)
  }

  /**
   * Snaps scroll view to a specific page
   * @param index page number
   */
  snapTo = async (index: number): Promise<void> => {
    this.listenerElement?.removeEventListener('scroll', this.startAnimation, false)
    this.animating = true;
    const snapPoint = { x: this.getPagerWidth() * index, y: 0 };
    this.speedDeltaX = 1;
    // smoothly move to the snap point
    await this.smoothScroll(this.target!, snapPoint);
    // after moving to the snap point, rebind the scroll event handler
    this.animating = false
    this.listenerElement?.addEventListener('scroll', this.startAnimation, false)
    this.onAnimationEnd!(this.calculateCurrentIndex())
  }
}