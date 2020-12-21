<template>
  <q-layout>
    <q-page-container>
      <q-page class="flex flex-center">
        <q-btn
          color="white"
          class="absolute-top-right"
          flat
          round
          :icon="$q.dark.isActive ? 'nights_stay' : 'wb_sunny'"
          @click="$q.dark.toggle()"
        />
        <q-card
          class="login-form"
          :style="$q.platform.is.mobile ? { width: '80%' } : { width: '30%' }"
        >
          <q-img src="/statics/images/pharmacy.jpg"></q-img>
          <q-card-section>
            <div class="row no-wrap items-center">
              <div class="col text-h6 ellipsis">Log in to Dashboard</div>
            </div>
          </q-card-section>
          <q-card-section>
            <q-form class="q-gutter-md">
              <div>
                <q-btn
                  label="Login"
                  type="button"
                  color="primary"
                  @click="login"
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { getModule } from 'vuex-module-decorators'
import { store } from '@/store'
import AuthStoreModule from '@/store/auth'

@Component
export default class LoginPage extends Vue {
  // @ts-expect-error can't figure out how to remove TS error
  private readonly authStore: AuthStoreModule = getModule(AuthStoreModule, store)

  login(): Promise<void> {
    return this.authStore.login()
  }

  loginNotify(): void {
    this.$q.notify({
      message: 'Login Successful',
    })
  }
}
</script>

<style>
.login-form {
  position: absolute;
}
</style>
