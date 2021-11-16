const StatusMap = {
    PEENDING: 'PEENDING',
    REJECTED: 'REJECTED',
    FULLFILLED: 'FULLFILLED',
}

function isFunc(fn) {
    return typeof (fn) === 'function'
}

/**
 * @description: 处理promise递归的函数
 * @param {*} promise 默认返回的promise
 * @param {*} x 我们自己 return 的对象
 * @param {*} resolve
 * @param {*} reject
 * @return {*} 
 * @Date Changed: 
 */
function reslovePromise(promise, x, resolve, reject) {
    // 循环应用报错
    if (x === promise) {
        // reject 报错抛出
        return reject(new TypeError('不能循环调用promise!'))
    }

    // 锁 防止多次调用
    let called

    // x 不是 null 且  是对象或者函数
    if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
        // A+ 规定，声明then = x的then方法
        try {
            let then = x.then;

            // 如果then是函数，就默认是promise了
            if (isFunc(then)) {
                // then 执行 第一个参数是 this 后面是成功的回调 和 失败的回调
                then.call(x, y => {
                    // 成功和失败只能调用一个
                    if (called) return;
                    called = true;
                    // 核心点2：resolve 的结果依旧是 promise 那就继续递归执行
                    reslovePromise(promise, y, resolve, reject);
                }, err => {
                    // 成功和失败只能调用一个
                    if (called) return;
                    called = true;
                    reject(err); // 失败了就失败了
                })
            } else {
                resolve(x); // 直接成功即可
            }
        } catch (error) {
            if (called) return;
            called = true;
            // 取then出错了那就不要在继续执行了
            reject(error);
        }
    } else {
        resolve(x)
    }
}

class MyPromise {
    constructor(fn) {
        this.state = StatusMap.PEENDING
        this.value = undefined
        this.reason = undefined
        this.resolveQueue = []; // 成功时回调队列
        this.rejectQueue = []; // 失败时回调队列

        // 成功
        const resolve = (value) => {
            if (this.state === StatusMap.PEENDING) {
                this.state = StatusMap.FULLFILLED
                this.value = value
                this.resolveQueue.forEach(fn => fn())
            }
        }
        // 失败
        const reject = (value) => {
            if (this.state === StatusMap.PEENDING) {
                this.state = StatusMap.REJECTED
                this.reason = value
                this.rejectQueue.forEach(fn => fn())
            }
        }
        // 判断是不是方法
        if (isFunc(fn)) {
            try {
                // 立即执行一次
                fn(resolve, reject)
            } catch (err) {
                reject(err)
            }
        }
    }
    // 声明then方法
    then(onFulfilled, onRejected) {
        onFulfilled = isFunc(onFulfilled) ? onFulfilled : value => value;
        onRejected = isFunc(onRejected) ? onRejected : err => {
            throw err;
        }


        const promise2 = new MyPromise((resolve, reject) => {

            const fulfilledMicrotask = () => {
                // 异步
                queueMicrotask(() => {
                    try {
                        // 先执行一次
                        const result = onFulfilled(this.value)
                        reslovePromise(promise2, result, resolve, reject)
                    } catch (err) {
                        reject(err)
                    }
                })
            }

            const rejectedMicrotask = () => {
                // 异步
                queueMicrotask(() => {
                    try {
                        // 先执行一次
                        const result = onRejected(this.reason)
                        reslovePromise(promise2, result, resolve, reject)
                    } catch (err) {
                        reject(err)
                    }
                })
            }


            if (this.state === StatusMap.FULLFILLED) {
                fulfilledMicrotask()
            } else if (this.state === StatusMap.REJECTED) {
                rejectedMicrotask()
            } else if (this.state === StatusMap.PEENDING) {
                this.resolveQueue.push(fulfilledMicrotask)
                this.rejectQueue.push(rejectedMicrotask)
            }
        })
        return promise2
    }

    catch (onRejected) {
        return this.then(null, onRejected)
    }

}

// resolve方法
MyPromise.resolve = function (value) {
    return new MyPromise((resolve) => {
        resolve(value);
    })
}

// reject方法
MyPromise.reject = function (value) {
    return new MyPromise((resolve, reject) => {
        reject(value);
    })
}
MyPromise.all = function (promises) {
    let count = 0;
    let res = new Array(promises.length)
    return new MyPromise((resolve, reject) => {
        try {
            for (let i = 0; i < promises.length; i++) {
                promises[i].then(result => {
                    res.splice(i, 1, result)
                    count++
                    if (count === promises.length) {
                        resolve(res)
                    }
                }).catch(err => {
                    reject(err)
                })
            }
        } catch (err) {
            reject(err)
        }
    })
}

MyPromise.race = function (promises) {
    return new MyPromise((resolve, reject) => {
        try {
            for (let i = 0; i < promises.length; i++) {
                promises[i].then((res) => {
                    resolve(res)
                })
            }
        } catch (error) {
            reject(error)
        }
    })
}


// https://juejin.cn/post/6945319439772434469#heading-15
// 如果要进行a+规范验证即开启
// MyPromise.deferred = function () {
//   var result = {};
//   result.promise = new MyPromise(function (resolve, reject) {
//     result.resolve = resolve;
//     result.reject = reject;
//   });

//   return result;
// }
// module.exports = MyPromise; 