<template>
	<aside
		:class="{'is-active': baseStore.menuActive, 'is-resizing': isResizing}"
		class="menu-container"
		:style="{'--sidebar-width': sidebarWidthStyle}"
	>
		<nav
			class="menu top-menu"
			:aria-label="$t('navigation.main')"
		>
			<RouterLink
				:to="{name: 'home'}"
				class="logo"
				:aria-label="$t('navigation.home')"
			>
				<Logo
					width="164"
					height="48"
				/>
			</RouterLink>
			<menu class="menu-list other-menu-items">
				<li>
					<RouterLink
						v-shortcut="SHORTCUTS.navigation.overview"
						:to="{ name: 'home'}"
					>
						<span class="menu-item-icon icon">
							<Icon icon="calendar" />
						</span>
						{{ $t('navigation.overview') }}
					</RouterLink>
				</li>
				<li>
					<RouterLink
						v-shortcut="SHORTCUTS.navigation.upcoming"
						:to="{ name: 'tasks.range'}"
					>
						<span class="menu-item-icon icon">
							<Icon :icon="['far', 'calendar-alt']" />
						</span>
						{{ $t('navigation.upcoming') }}
					</RouterLink>
				</li>
				<li>
					<RouterLink :to="{ name: 'dashboard'}">
						<span class="menu-item-icon icon">
							<Icon icon="chart-pie" />
						</span>
						{{ $t('navigation.dashboard') }}
					</RouterLink>
				</li>
				<li>
					<RouterLink :to="{ name: 'workload'}">
						<span class="menu-item-icon icon">
							<Icon icon="table-cells" />
						</span>
						{{ $t('navigation.workload') }}
					</RouterLink>
				</li>
				<li>
					<RouterLink :to="{ name: 'tools'}">
						<span class="menu-item-icon icon">
							<Icon icon="bolt" />
						</span>
						{{ $t('navigation.tools') }}
					</RouterLink>
				</li>
				<li>
					<RouterLink
						v-shortcut="SHORTCUTS.navigation.projects"
						:to="{ name: 'projects.index'}"
					>
						<span class="menu-item-icon icon">
							<Icon icon="layer-group" />
						</span>
						{{ $t('project.projects') }}
					</RouterLink>
				</li>
				<li>
					<RouterLink
						v-shortcut="SHORTCUTS.navigation.labels"
						:to="{ name: 'labels.index'}"
					>
						<span class="menu-item-icon icon">
							<Icon icon="tags" />
						</span>
						{{ $t('label.title') }}
					</RouterLink>
				</li>
				<li>
					<RouterLink
						v-shortcut="SHORTCUTS.navigation.teams"
						:to="{ name: 'teams.index'}"
					>
						<span class="menu-item-icon icon">
							<Icon icon="users" />
						</span>
						{{ $t('team.title') }}
					</RouterLink>
				</li>
				<li v-if="timeTrackingEnabled">
					<RouterLink :to="{ name: 'time-tracking'}">
						<span class="menu-item-icon icon">
							<Icon :icon="['far', 'clock']" />
						</span>
						{{ $t('timeTracking.title') }}
					</RouterLink>
				</li>
			</menu>
		</nav>

		<Loading
			v-if="projectList.isLoading"
			variant="small"
		/>
		<template v-else>
			<nav
				v-if="favoriteProjects.length"
				class="menu"
				:aria-label="$t('project.pseudo.favorites.title')"
			>
				<p
					class="menu-label"
					aria-hidden="true"
				>
					{{ $t('project.pseudo.favorites.title') }}
				</p>
				<ProjectsNavigation
					:model-value="favoriteProjects"
					:can-edit-order="false"
					:can-collapse="false"
				/>
			</nav>
			
			<nav
				v-if="savedFilterProjects.length"
				class="menu"
				:aria-label="$t('navigation.savedFilters')"
			>
				<p
					class="menu-label"
					aria-hidden="true"
				>
					{{ $t('navigation.savedFilters') }}
				</p>
				<ProjectsNavigation
					:model-value="savedFilterProjects"
					:can-edit-order="false"
					:can-collapse="false"
				/>
			</nav>

			<nav
				class="menu"
				:aria-label="$t('project.projects')"
			>
				<p
					class="menu-label"
					aria-hidden="true"
				>
					{{ $t('project.projects') }}
				</p>
				<ProjectsNavigation
					:model-value="projects"
					:can-edit-order="true"
					:can-collapse="true"
				/>
			</nav>
		</template>

		<div
			v-if="!isMobile"
			class="resize-handle"
			@mousedown="startResize"
			@touchstart="startResize"
		/>
	</aside>
</template>

<script setup lang="ts">
import {computed} from 'vue'

import {SHORTCUTS} from '@/constants/shortcuts'
import Logo from '@/components/home/Logo.vue'
import Loading from '@/components/misc/Loading.vue'

import {useBaseStore} from '@/stores/base'
import {useProjects} from '@/composables/useProjects'
import {useConfigStore} from '@/stores/config'
import {PRO_FEATURE} from '@/constants/proFeatures'
import ProjectsNavigation from '@/components/home/ProjectsNavigation.vue'
import {useSidebarResize} from '@/composables/useSidebarResize'

const baseStore = useBaseStore()
const projectList = useProjects()
const configStore = useConfigStore()

const timeTrackingEnabled = computed(() => configStore.isProFeatureEnabled(PRO_FEATURE.TIME_TRACKING))

const {sidebarWidthStyle, isResizing, startResize, isMobile} = useSidebarResize()

const projects = computed(() => projectList.notArchivedRootProjects)
const favoriteProjects = computed(() => projectList.favoriteProjects)
const savedFilterProjects = computed(() => projectList.savedFilterProjects)
</script>

<style lang="scss" scoped>
.logo {
	display: flex;
	align-items: center;
	min-block-size: $navbar-height;
	padding-inline: 1.25rem;
	margin-block: -1rem .5rem;
}

.menu-container {
	--sidebar-width: #{$navbar-width};

	display: flex;
	flex-direction: column;
	background: var(--sidebar-background);
	border-inline-end: 1px solid var(--grey-200);
	color: $vikunja-nav-color;
	padding: 1rem 0;
	transition: transform $transition-duration ease-in;
	position: fixed;
	inset-block-start: 0;
	inset-block-end: 0;
	inset-inline-start: 0;
	z-index: 31;
	transform: translateX(-100%);
	inline-size: var(--sidebar-width);
	overflow-y: auto;

	[dir="rtl"] & {
		transform: translateX(100%);
	}

	@media screen and (max-width: $tablet) {
		inline-size: 70vw;
		z-index: 20;
	}

	&.is-active {
		transform: translateX(0);
		transition: transform $transition-duration ease-out;
	}

	&.is-resizing {
		transition: none;
	}
}

.resize-handle {
	position: absolute;
	inset-block-start: 0;
	inset-block-end: 0;
	inset-inline-end: 0;
	inline-size: 4px;
	cursor: ew-resize;
	background: transparent;
	transition: background-color $transition-duration ease;
	touch-action: none;

	&:hover,
	&:active {
		background-color: var(--primary);
	}
}

.menu-container .top-menu .menu-list {
	padding-inline: .75rem;

	li {
		font-weight: 500;
		font-size: .9375rem;
		block-size: auto;
		margin-block-end: 2px;

		&:hover {
			background: transparent;
		}
	}

	li > a {
		inline-size: 100%;
		padding: .5rem .75rem;
		border-radius: $radius;
		display: flex;
		gap: .25rem;
		color: var(--grey-600);
		transition: background-color $transition, color $transition;

		.icon {
			color: var(--grey-400);
			padding-block-end: 0;
		}

		&:hover {
			background: hsla(var(--primary-hsl), .06);
			color: var(--text-strong);
		}

		&.router-link-exact-active {
			background: var(--primary);
			color: #ffffff;
			font-weight: 600;
			box-shadow: 0 4px 12px hsla(var(--primary-hsl), .25);

			.icon {
				color: #ffffff;
			}
		}
	}
}

.menu-label {
	padding-inline: 1.5rem;
	margin-block: 0 .375rem;
	font-size: .6875rem;
	font-weight: 700;
	letter-spacing: .06em;
	text-transform: uppercase;
	color: var(--text-muted);
}

.menu + .menu {
	padding-block-start: 1.25rem;
}
</style>
