<template>
	<RouterLink
		class="overview-project-card"
		:to="{name: 'project.index', params: {projectId: project.id}}"
		:style="{'--project-color': getHexColor(project.hex_color)}"
	>
		<span class="overview-project-card__title">
			<Icon
				v-if="project.id < -1"
				icon="filter"
				class="overview-project-card__filter-icon"
			/>
			{{ getProjectTitle(project) }}
		</span>
		<span
			v-if="description"
			class="overview-project-card__description"
		>{{ description }}</span>

		<template v-if="progress && total > 0">
			<span class="overview-project-card__progress-text">
				<span>{{ $t('home.projectProgress', {done: progress.done, total}) }}</span>
				<strong>{{ percent }}%</strong>
			</span>
			<span
				class="overview-project-card__bar"
				role="progressbar"
				:aria-valuenow="percent"
				aria-valuemin="0"
				aria-valuemax="100"
				:aria-label="$t('home.projectProgress', {done: progress.done, total})"
			>
				<span :style="{inlineSize: `${percent}%`}" />
			</span>
		</template>
		<span
			v-else-if="progress"
			class="overview-project-card__progress-text"
		>{{ $t('home.projectEmpty') }}</span>
	</RouterLink>
</template>

<script setup lang="ts">
import {computed} from 'vue'

import type {ProjectResponse} from '@/client/queries/projects'
import type {ProjectProgress} from '@/composables/useProjectProgress'
import {getProjectTitle} from '@/helpers/getProjectTitle'
import {getHexColor} from '@/helpers/task'

const props = defineProps<{
	project: ProjectResponse,
	progress?: ProjectProgress,
}>()

const description = computed(() => (props.project.description ?? '').replace(/<[^>]*>/g, ' ').trim())
const total = computed(() => props.progress ? props.progress.open + props.progress.done : 0)
const percent = computed(() => total.value ? Math.round((props.progress!.done / total.value) * 100) : 0)
</script>

<style lang="scss" scoped>
.overview-project-card {
	--project-color: var(--primary);
	display: flex;
	flex-direction: column;
	gap: .35rem;
	block-size: 100%;
	padding: 1rem 1.1rem;
	border: 1px solid var(--grey-200);
	border-block-start: 4px solid var(--project-color);
	border-radius: $radius-large;
	background: var(--white);
	color: var(--text);
	box-shadow: var(--shadow-xs);
	transition: box-shadow $transition, transform $transition;

	&:hover {
		box-shadow: var(--shadow-md);
		transform: translateY(-1px);
		color: var(--text);
	}
}

.overview-project-card__title {
	font-family: $vikunja-font;
	font-size: 1.05rem;
	font-weight: 700;
	color: var(--grey-900);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.overview-project-card__filter-icon {
	color: var(--grey-400);
	margin-inline-end: .25rem;
}

.overview-project-card__description {
	font-size: .8rem;
	color: var(--grey-500);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.overview-project-card__progress-text {
	display: flex;
	justify-content: space-between;
	margin-block-start: auto;
	padding-block-start: .5rem;
	font-size: .8rem;
	color: var(--grey-600);

	strong {
		color: var(--grey-800);
	}
}

.overview-project-card__bar {
	display: block;
	block-size: 6px;
	border-radius: 999px;
	background: var(--grey-100);
	overflow: hidden;

	span {
		display: block;
		block-size: 100%;
		border-radius: inherit;
		background: var(--project-color);
	}
}
</style>
