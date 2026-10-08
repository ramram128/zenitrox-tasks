<template>
	<Message variant="danger">
		<i18n-t
			keypath="loadingError.failed"
			scope="global"
		>
			<ButtonLink @click="reload">
				{{ $t('loadingError.tryAgain') }}
			</ButtonLink>
			<ButtonLink href="mailto:zenitroxofficials@gmail.com">
				{{ $t('loadingError.contact') }}
			</ButtonLink>
		</i18n-t>
	</Message>
</template>

<script lang="ts" setup>
import Message from '@/components/misc/Message.vue'
import ButtonLink from '@/components/misc/ButtonLink.vue'

defineOptions({
	inheritAttrs: false,
})

function reload() {
	window.location.reload()
}
</script>
