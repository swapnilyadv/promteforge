import { browser } from 'wxt/browser';
import type { StatusResponse } from '../../lib/messages.js';
import { pickModel } from '../../lib/forge.js';
import { loadSettings, saveSettings, type Settings } from '../../lib/settings.js';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

async function init() {
  const settings = await loadSettings();
  const model = $<HTMLSelectElement>('model');
  const style = $<HTMLSelectElement>('style');
  style.value = settings.style;

  let status: StatusResponse = { running: false, models: [] };
  try {
    status = ((await browser.runtime.sendMessage({ type: 'status' })) as StatusResponse | undefined) ?? status;
  } catch {
    /* worker asleep or unreachable: show the help text */
  }

  $('dot').classList.add(status.running ? 'on' : 'off');
  $('state').textContent = status.running
    ? `Ollama is running · ${status.models.length} model${status.models.length === 1 ? '' : 's'}`
    : 'Ollama is not reachable';
  $('help').hidden = status.running;

  const names = status.models.length ? status.models : settings.model ? [settings.model] : [];
  model.innerHTML = names.map((m) => `<option>${m.replace(/[&<>]/g, '')}</option>`).join('') || '<option value="">(none)</option>';
  model.value = pickModel(settings.model, names) ?? '';

  model.addEventListener('change', () => void saveSettings({ model: model.value }));
  style.addEventListener('change', () => void saveSettings({ style: style.value as Settings['style'] }));
}

void init();
