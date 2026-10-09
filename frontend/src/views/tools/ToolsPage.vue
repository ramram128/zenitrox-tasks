<template>
	<div class="tools-page">
		<header class="tools-header">
			<h1>{{ $t('tools.title') }}</h1>
			<p>{{ $t('tools.intro') }}</p>
		</header>

		<div class="tools-grid">
			<article
				v-for="tool in TOOLS"
				:key="tool.id"
				class="tool-card"
			>
				<header class="tool-card__header">
					<span class="tool-card__icon">
						<Icon :icon="tool.icon" />
					</span>
					<h2>{{ tool.name }}</h2>
				</header>

				<p class="tool-card__summary">
					{{ tool.summary }}
				</p>

				<div class="tool-card__actions">
					<a
						v-for="action in tool.actions"
						:key="action.href"
						:href="action.href"
						class="tool-card__action"
						:download="action.download ? '' : undefined"
						:target="action.download ? undefined : '_blank'"
						:rel="action.download ? undefined : 'noopener noreferrer'"
					>
						<Icon :icon="action.icon" />
						{{ action.label }}
					</a>
				</div>

				<section
					v-for="section in tool.sections"
					:key="section.title"
					class="tool-card__section"
				>
					<h3>{{ section.title }}</h3>
					<ol>
						<li
							v-for="step in section.steps"
							:key="step"
						>
							{{ step }}
						</li>
					</ol>
				</section>
			</article>
		</div>
	</div>
</template>

<script setup lang="ts">
import {useI18n} from 'vue-i18n'

import {useTitle} from '@/composables/useTitle'
import {TOOLS} from './tools'

const {t} = useI18n({useScope: 'global'})
useTitle(() => t('tools.title'))
</script>

<style lang="scss" scoped>
.tools-page {
	max-inline-size: 1200px;
	margin-inline: auto;
}

.tools-header {
	margin-block-end: 1.25rem;

	h1 {
		margin: 0 0 .25rem;
		font-family: $vikunja-font;
		font-size: 2rem;
		font-weight: 700;
	}

	p {
		margin: 0;
		color: var(--grey-500);
	}
}

.tools-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
	gap: 1.25rem;
	align-items: start;

	@media screen and (max-width: $tablet) {
		grid-template-columns: minmax(0, 1fr);
	}
}

.tool-card {
	display: flex;
	flex-direction: column;
	gap: 1rem;
	padding: 1.5rem;
	border: 1px solid var(--grey-200);
	border-radius: $radius-large;
	background: var(--white);
	box-shadow: var(--shadow-xs);
}

.tool-card__header {
	display: flex;
	align-items: center;
	gap: .75rem;

	h2 {
		margin: 0;
		font-size: 1.2rem;
	}
}

.tool-card__icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	inline-size: 2.5rem;
	block-size: 2.5rem;
	border-radius: $radius;
	background: hsla(var(--primary-h), var(--primary-s), var(--primary-l), .12);
	color: var(--primary);
}

.tool-card__summary {
	margin: 0;
	color: var(--grey-600);
	line-height: 1.55;
}

.tool-card__actions {
	display: flex;
	flex-wrap: wrap;
	gap: .5rem;
}

.tool-card__action {
	display: inline-flex;
	align-items: center;
	gap: .5rem;
	padding: .55rem 1rem;
	border-radius: $radius;
	background: var(--primary);
	color: #ffffff; // on the primary color in both themes, where --white turns dark
	font-size: .9rem;
	font-weight: 600;

	&:hover {
		color: #ffffff;
		filter: brightness(1.08);
	}

	& + &,
	& + &:hover {
		background: hsla(var(--primary-h), var(--primary-s), var(--primary-l), .1);
		color: var(--primary);
	}
}

.tool-card__section {
	padding-block-start: .75rem;
	border-block-start: 1px solid var(--grey-100);

	h3 {
		margin: 0 0 .4rem;
		font-size: .8rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: .04em;
		color: var(--grey-500);
	}

	ol {
		margin: 0;
		padding-inline-start: 1.25rem;
		font-size: .9rem;
		line-height: 1.6;
	}
}
</style>
