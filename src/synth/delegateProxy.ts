// delegates method calls to multiple targets
export default function delegateProxy<T extends Object>(targets: T[]) {
  return new Proxy<T>(targets[0], {
    get(_target, propKey, _receiver) {
      return (...args: any[]) => {
        targets
          .map((t) => (t as any)[propKey].bind(t))
          .forEach((f) => f(...args))
      }
    },
  })
}
