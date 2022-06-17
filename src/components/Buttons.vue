<script lang="ts">
import { defineComponent } from "vue";

    export default defineComponent({
        props: {
            array: Array,
        },
        data() {
            return {
                labelNeither: 'These two options are equally bad.'
            }
        },
        mounted() {
            this.array
            this.labelNeither
        }

    });

</script>
<template>
    <section class="wrapper">
        <div class="flex-item">
            <button id="left" v-on:click="$emit('buttonClicked', 'left')"><slot name="left">Something went wrong. :(</slot></button>
        </div>
        <div class="middle-item">
            <button id="neither" v-on:click="$emit('buttonClicked', 'neither')">{{ labelNeither }}</button>
        </div>
        <div class="flex-item">
            <button id="right" v-on:click="$emit('buttonClicked', 'right')"><slot name="right">Something went wrong. :(</slot></button>
        </div>
    </section>
</template>

<style scoped>
button {
    width: 100%;
    height: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    word-wrap: break-word;
    line-height: 1em;
}
.flex-item {
    flex: 0 0 35%;
}
.flex-item button {
    font-size: 7vmin;
}
.middle-item {
    flex: 0 1 20%;
    height: 50%;
    align-self: center;
}
#neither {
    font-size: 4vmin;
}
.wrapper {
    display: flex;
    flex-direction: row;
    justify-content: space-around;
    align-items: normal;
    align-content: normal;
    height: 50vh;
}

@media only screen and (max-aspect-ratio: 1/1) {
    .wrapper {
        flex-direction: column;
        height: 80vh;
    }
    .middle-item {
        flex: 0 2 10%;
    }
}
</style>