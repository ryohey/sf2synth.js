// delegates method calls to multiple targets
export default function delegateProxy(targets) {
    return new Proxy(targets[0], {
        get(_target, propKey, _receiver) {
            return (...args) => {
                targets
                    .map((t) => t[propKey].bind(t))
                    .forEach((f) => f(...args));
            };
        },
    });
}
//# sourceMappingURL=delegateProxy.js.map