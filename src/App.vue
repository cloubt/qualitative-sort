<script setup lang="ts">
  import Buttons from './components/Buttons.vue'
  import Start from './components/Start.vue'
  import Start1 from './components/Start.vue'
  import { reactive, ref, shallowRef, markRaw } from 'vue'

  // shallowref
  let current = markRaw(Start)
  function log() {
    console.log(current.value)
    // raw buttons no wrappers
    current.value = markRaw(Buttons)
    console.log(current.value)
  }
</script>

<template>
  <!-- IDE was mean and highlighted component attribute in red :( -->
  <component :is="current">
    <template v-slot:left>
      Hi guys! :)
    </template>
    <template v-slot:right>
      Hello.
    </template>
  </component>
  <button @click="log" v-if="current.value != Start">Go to buttons</button>
</template>

<style>
body {
  margin: 0;
  text-overflow: ellipsis;
}
#app {
  height: 100vh;
  width: 100vw;
  min-width: 200px;
  min-height: 100px;
  display: flex;
  flex-direction: column;
  align-content: space-around;
  justify-content: space-around;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji';
  text-align: center;
  background-color: rgb(163, 82, 82);
}
</style>
