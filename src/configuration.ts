export interface Configuration {
  /**
   * time in ms after which scrolling is considered finished
   **/
  timeout?: number | undefined
  /**
   * duration in ms for the smooth snap
   **/
  duration?: number | undefined
  /**
   * custom easing function
   * @param t normalized time typically in the range [0, 1]
   **/
  easing?: (t: number) => number | undefined

  /**
   * additional offset - can be used to alleviate any issues regarding margin/padding
   * @param t e.g. '10px' or '2rem' or 10 (when specifiyng as number, it will be treated as pixels)
   **/
  offset?: string | number | undefined
}