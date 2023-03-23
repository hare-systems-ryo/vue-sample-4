<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { Device } from './device';
const elmTop = ref<HTMLElement | null>(null);
const elmBottom = ref<HTMLElement | null>(null);

const message = ref<string[]>([]);
const selectedDeviceId = ref<string>('');
const stream = ref<MediaStream | null>(null);

const videoElm = ref<HTMLVideoElement | null>(null);

const videoList = ref<Device.DeviceListRow[]>([]);
const getDeviceList = async () => {
  videoList.value = await Device.GetMediaList(Device.MediaKind.videoinput);
};

watch(selectedDeviceId, async () => {
  if (!selectedDeviceId.value) return;
  console.log('ID　変更');
  message.value.push('ID 変更 :' + selectedDeviceId.value);
  startStream(selectedDeviceId.value);
});

onMounted(() => {
  getDeviceList();
});

const startStream = async (deviceId: string) => {
  const ret = await Device.GetVideoStream(deviceId);
  if (ret.stream !== null) {
    stream.value = ret.stream;
  } else {
    message.value.push('GetVideoStream : Error : ' + ret.message);
  }
};

/**
 * カメラ Stream停止
 */
const stopStream = () => {
  //console.log('stopStream');
  stream.value = Device.StopVideoStream(stream.value);
};
</script>
<template>
  <div class="container-fluid">
    <div class="card mt-2 mb-3" ref="elmTop">
      <div class="card-header bg-info">カメラ</div>
      <div class="card-body">
        <div class="">デバイスリスト</div>
        <select class="form-select" aria-label="Default select example" v-model="selectedDeviceId">
          <template v-for="(row, index) in videoList" :key="index">
            <option :value="row.deviceId">{{ row.label }}</option>
          </template>
        </select>
        <video
          class="video-origin"
          ref="videoElm"
          autoplay="true"
          muted="true"
          playsinline="true"
          :srcObject="stream"
        ></video>
        <div class="">{{ videoList }}</div>
        <div class="message">{{ message.join('\n') }}</div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.card,
.card-header,
.card-body {
  border-color: rgb(24, 7, 112);
}

.message {
  white-space: pre;
}
</style>
