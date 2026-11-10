<script lang="ts">
  import { onMount } from 'svelte';
  import { t, setLanguage, currentLanguage } from './i18n/index.svelte';
  import { dayKey, streak, lastDays, prune, addDays, type GlassesByDay } from './logic';
  import { paletteFrom, glassFrom, tintTextFrom, type Palette, type Glass } from './palette';
  import { offerTracker } from './tracker-offer';
  import { onPrefsChange } from './prefs-live';

  const GOALS = [6, 8, 10];
  const GLASS_SIZES = [200, 250, 330, 500];

  let plugin: any;
  let view = $state<'modal' | 'widget'>('modal');
  let palette = $state<Palette>(paletteFrom(undefined));
  let glass = $state<Glass>(glassFrom(undefined));
  let scale = $state(1);
  let glassesByDay = $state<GlassesByDay>({});
  let settings = $state({ goal: 8, glassMl: 250 });
  let ready = $state(false);
  let today = $state(new Date());

  const key = $derived(dayKey(today));
  const glasses = $derived(glassesByDay[key] || 0);
  const progress = $derived(Math.min(1, glasses / settings.goal));
  const currentStreak = $derived(streak(glassesByDay, settings.goal, today));
  const week = $derived(lastDays(glassesByDay, today));
  const weekMax = $derived(Math.max(settings.goal, ...week.map((d) => d.glasses)));

  const applyNomieValues = () => {
    if (!plugin?.prefs) return;
    palette = paletteFrom(plugin.prefs);
    setLanguage(plugin.prefs?.language);
    glass = glassFrom(plugin.prefs);
    scale = plugin.prefs.fontScale || 1;
  };

  const save = () => plugin?.storage.setItem('glasses', glassesByDay);
  const saveSettings = () => plugin?.storage.setItem('settings', settings);

  const setGlasses = (count: number) => {
    glassesByDay = prune({ ...glassesByDay, [key]: Math.max(0, count) }, today);
    save();
  };

  // Each glass also goes into the timeline, so it shows with the rest of the day
  const addGlass = () => {
    setGlasses(glasses + 1);
    plugin.createNote(`Water: 1 glass (${settings.glassMl} ml) #water`);
  };

  // Removes a glass from this count only. The note in the timeline stays, as it is a record.
  const removeGlass = () => setGlasses(glasses - 1);

  const changeGoal = (goal: number) => {
    settings = { ...settings, goal };
    saveSettings();
  };
  const changeGlass = (glassMl: number) => {
    settings = { ...settings, glassMl };
    saveSettings();
  };

  const load = async () => {
    await plugin.storage.init();
    glassesByDay = plugin.storage.getItem('glasses') || {};
    const saved = plugin.storage.getItem('settings');
    if (saved) settings = { ...settings, ...saved };
    today = new Date();
    ready = true;
  };

  onMount(() => {
    plugin = new NomiePlugin({
      name: 'Nomie Hydration',
      emoji: '💧',
      description: 'Log each glass of water with one tap, and see your day and your streak. A missed day does not break the streak once.',
      uses: ['createNote', 'getStorageItem', 'setStorageItem', 'getTrackable', 'openTrackableEditor', 'confirm'],
      version: '2.0',
      addToCaptureMenu: true,
      addToMoreMenu: true,
      addToWidgets: true,
    });
    onPrefsChange(plugin, () => applyNomieValues());
  plugin.onRegistered(async () => {
      applyNomieValues();
      await load();
    });
    plugin.onWidget(async () => {
      view = 'widget';
      applyNomieValues();
      if (!ready) await load();
    });
    plugin.onUIOpened(async () => {
      view = 'modal';
      applyNomieValues();
      offerTracker(plugin, { tag: 'water', label: t('trackerLabel'), emoji: '💧', color: '#32ADE6' });
      if (!ready) await load();
    });
  });
</script>

<div class="card" class:widget={view === 'widget'} style="--page: {palette.page}; --card: {palette.card}; --text: {palette.text}; --muted: {palette.textSecondary}; --line: {palette.separator}; --fill: {palette.fill}; --tint: {palette.tint}; --on-tint: {palette.onTint}; --tint-soft: {palette.tintSoft}; --glass-fill: {glass.fill}; --glass-edge: {glass.edge}; --glass-blur: {glass.blur}; --glass-shadow: {glass.shadow}; --scale: {scale};">
  {#if view !== 'widget'}
    <header class="top"><h1>{t('title')}</h1></header>
  {/if}
  {#if view === 'widget'}
    <div class="head">
      <span aria-hidden="true">💧</span>
      <span class="count">{glasses} / {settings.goal}</span>
      <span>🔥 {currentStreak}</span>
    </div>
    <div class="glasses" aria-hidden="true">
      {#each Array(settings.goal) as _, i (i)}
        <span class:filled={i < glasses}>{i < glasses ? '●' : '○'}</span>
      {/each}
    </div>
    <button class="primary wide" onclick={addGlass} aria-label={t('addAria')}>{t('addGlass')}</button>
  {:else}
    <p class="muted">{today.toLocaleDateString(currentLanguage(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>

    <section class="panel">
      <div class="big">{glasses}<span class="of"> / {settings.goal}</span></div>
      <div class="bar"><div style="width: {progress * 100}%"></div></div>
      <p class="muted">{t('mlOfTotal', { ml: Math.round(glasses * settings.glassMl), total: settings.goal * settings.glassMl })}</p>
      <div class="actions">
        <button class="primary" onclick={addGlass}>{t('addGlass')}</button>
        <button class="ghost" onclick={removeGlass} disabled={glasses === 0}>{t('removeGlass')}</button>
      </div>
    </section>

    <h2>{t('streak')}</h2>
    <p>🔥 {currentStreak} {currentStreak === 1 ? t('dayOne') : t('dayMany')} {t('streakNote')}</p>

    <h2>{t('lastSeven')}</h2>
    <section class="panel week">
      {#each week as d (d.date.toDateString())}
        <div class="col">
          <div class="column"><div style="height: {(d.glasses / weekMax) * 100}%"></div></div>
          <span class="label">{d.date.toLocaleDateString(currentLanguage(), { weekday: 'short' })}</span>
          <span class="value">{d.glasses}</span>
        </div>
      {/each}
    </section>

    <h2>{t('goal')}</h2>
    <div class="chips">
      {#each GOALS as g (g)}
        <button class:active={settings.goal === g} onclick={() => changeGoal(g)}>{t('goalChip', { n: g })}</button>
      {/each}
    </div>

    <h2>{t('glassSize')}</h2>
    <div class="chips">
      {#each GLASS_SIZES as ml (ml)}
        <button class:active={settings.glassMl === ml} onclick={() => changeGlass(ml)}>{t('mlChip', { n: ml })}</button>
      {/each}
    </div>
    <p class="muted">{t('removeNote')}</p>
  {/if}
</div>

<style>
  /* the app's text: its iOS font stack, with the app's smoothing */
  :global(body) { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif; -webkit-font-smoothing: antialiased; --ios-font-rounded: ui-rounded, -apple-system, system-ui, sans-serif; }
  /* the header is a Liquid Glass bar (D-glass): it stays at the top and the content scrolls under it */
  .top { position: sticky; top: 0; z-index: 2; margin: -16px -16px 8px; padding: 16px 16px 10px; background: var(--glass-fill); -webkit-backdrop-filter: var(--glass-blur); backdrop-filter: var(--glass-blur); border-bottom: 1px solid var(--glass-edge); }
  .card { box-sizing: border-box; min-height: 100vh; padding: 16px; background: var(--page); color: var(--text); font-size: calc(16px * var(--scale)); line-height: 1.4; }
  .card.widget { min-height: 0; padding: 12px; font-size: calc(14px * var(--scale)); }
  h1 { margin: 0; font-size: calc(26px * var(--scale)); font-weight: 700; }
  h2 { margin: 20px 0 6px; font-size: calc(13px * var(--scale)); font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .muted { margin: 4px 0; color: var(--muted); }
  .panel { padding: 16px; border-radius: 16px; background: var(--card); }
  .head { display: flex; align-items: center; gap: 8px; font-weight: 600; }
  .head .count { margin-left: auto; }
  .glasses { margin: 8px 0; font-size: calc(18px * var(--scale)); letter-spacing: 2px; word-break: break-all; line-height: 1.5; }
  .glasses .filled { color: var(--tint); }
  .big { font-family: var(--ios-font-rounded); font-size: calc(44px * var(--scale)); font-weight: 700; line-height: 1; }
  .of { font-size: calc(20px * var(--scale)); font-weight: 400; color: var(--muted); }
  .bar { height: 12px; margin: 12px 0 6px; border-radius: 6px; background: var(--fill); overflow: hidden; }
  .bar > div { height: 100%; background: var(--tint); transition: width 0.3s ease; }
  .actions { display: flex; gap: 8px; margin-top: 12px; }
  .primary, .ghost { padding: 12px 16px; border-radius: 12px; font: inherit; font-weight: 600; cursor: pointer; border: 0; }
  .primary { background: var(--tint); color: var(--on-tint); }
  .wide { width: 100%; margin-top: 6px; }
  .ghost { background: var(--fill); color: var(--text); }
  .ghost:disabled { opacity: 0.4; cursor: default; }
  .week { display: flex; gap: 6px; height: 160px; align-items: flex-end; }
  .col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
  .column { flex: 1; width: 100%; display: flex; align-items: flex-end; }
  .column > div { width: 100%; min-height: 2px; background: var(--tint); border-radius: 4px 4px 0 0; }
  .label { font-size: calc(12px * var(--scale)); color: var(--muted); }
  .value { font-size: calc(12px * var(--scale)); font-weight: 600; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chips button { padding: 8px 12px; border: 0; border-radius: 10px; background: var(--fill); color: var(--text); font: inherit; cursor: pointer; }
  .chips button.active { background: var(--tint-soft); color: var(--tint); font-weight: 600; }
</style>
