const list = document.getElementById('list');
const form = document.getElementById('form');
const input = document.getElementById('text');
const errorEl = document.getElementById('error');

function showError(msg) { errorEl.textContent = msg || ''; }

function render(notes) {
  list.replaceChildren(...notes.map((n) => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = n.text; // textContent, never innerHTML: no XSS
    const del = document.createElement('button');
    del.textContent = 'Delete';
    del.setAttribute('aria-label', `Delete note ${n.id}`);
    del.onclick = async () => {
      await fetch(`/api/notes/${n.id}`, { method: 'DELETE' });
      load();
    };
    li.append(span, del);
    return li;
  }));
}

async function load() {
  try {
    const res = await fetch('/api/notes');
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    render(await res.json());
    showError();
  } catch (err) {
    showError(`Could not load notes: ${err.message}`);
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const res = await fetch('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: input.value })
  });
  if (!res.ok) return showError((await res.json()).error);
  input.value = '';
  load();
});

load();
