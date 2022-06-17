import { createSimpleExpression } from '@vue/compiler-core';
import { createApp } from 'vue'
import App from './App.vue'
import { timsort} from './TimSort'
createApp(App).mount('#app')

let numbers = ["a", "aaa", "aaaaaaa", "aa", "aaaa"]

//numbers.sort(await comparator)
console.log(numbers)

async function input<T>(a: T, b: T): Promise<number> {
    let hi = prompt(`Is ${a} or ${b} higher? (-1 if left, 1 if right)`)
    if (hi === null) return 0
    return parseInt(hi)
}

async function comparator(a: String, b: String) {
    console.log(`${a} and ${b}`)
    if (a.length === b.length) return 0
    else {
        return await input(a, b)
    }
}
