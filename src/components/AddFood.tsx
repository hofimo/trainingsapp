import { useEffect, useMemo, useRef, useState } from 'react'
import { MEALS, lookupBarcode, macrosFor, matchScore, mealLabel, searchOff, slug } from '../foods'
import { uid, useStore } from '../store'
import type { Food, FoodEntry, Macros, Meal } from '../types'
import { fmtNum } from '../util'
import BarcodeScanner from './BarcodeScanner'
import NumInput from './NumInput'

const fmtInt = (n: number) => fmtNum(Math.round(n), 0)

export function MacroLine({ m, className = 'small muted' }: { m: Macros; className?: string }) {
  return (
    <span className={className}>
      E {fmtInt(m.protein)} · F {fmtInt(m.fat)} · KH {fmtInt(m.carbs)}
    </span>
  )
}

function FoodRow({ food, onPick, fav, onFav }: { food: Food; onPick: () => void; fav?: boolean; onFav?: () => void }) {
  const p = food.portions?.[0]
  return (
    <li className="food-row">
      <button className="food-main" onClick={onPick}>
        <b>{food.name}</b>
        <span className="small muted">
          {food.brand ? `${food.brand} · ` : ''}
          {fmtInt(food.per100.kcal)} kcal/100 {food.unit}
          {p ? ` · ${p.label} ${fmtNum(p.g)} ${food.unit}` : ''}
        </span>
      </button>
      {onFav && (
        <button className={`star ${fav ? 'on' : ''}`} aria-label={fav ? 'Aus Favoriten entfernen' : 'Zu Favoriten'} onClick={onFav}>
          {fav ? '★' : '☆'}
        </button>
      )}
    </li>
  )
}

/** Menge wählen (Gramm oder Portionen) und Mahlzeit, mit Vorschau der Nährwerte */
export function AmountPicker({
  food,
  entry,
  meal: meal0,
  date,
  onDone,
  onCancel,
}: {
  food: Food
  entry?: FoodEntry
  meal: Meal
  date: string
  onDone: () => void
  onCancel: () => void
}) {
  const { foodLog, saveFoodEntries, removeFoodEntry, foodFavs, toggleFoodFav, saveFood } = useStore()
  // Zuletzt verwendete Menge dieses Lebensmittels vorschlagen
  const last = useMemo(() => [...foodLog].reverse().find((e) => e.foodId === food.id), [foodLog, food.id])
  const start = entry ?? last
  const portions = food.portions ?? []
  const [unit, setUnit] = useState<string>(start?.portion?.label ?? (start ? food.unit : portions[0]?.label ?? food.unit))
  const [qty, setQty] = useState<number | null>(start ? (start.portion?.qty ?? start.amount) : portions[0] ? 1 : 100)
  const [meal, setMeal] = useState<Meal>(entry?.meal ?? meal0)

  const portion = portions.find((p) => p.label === unit)
  const amount = qty == null ? 0 : portion ? qty * portion.g : qty
  const m = macrosFor(food, amount)
  const fav = foodFavs.includes(food.id)

  function save() {
    if (!amount) return
    // Lebensmittel aus Open Food Facts lokal merken, damit sie offline und unter „Zuletzt“ da sind
    if (food.source === 'off') saveFood(food)
    saveFoodEntries([
      {
        id: entry?.id ?? uid(),
        date: entry?.date ?? date,
        meal,
        foodId: food.id,
        name: food.name,
        brand: food.brand,
        amount: Math.round(amount * 10) / 10,
        unit: food.unit,
        portion: portion ? { label: portion.label, qty: qty ?? 1 } : undefined,
        ...m,
        at: entry?.at ?? new Date().toISOString(),
      },
    ])
    onDone()
  }

  return (
    <div className="picker">
      <div className="picker-head">
        <div>
          <h2>{food.name}</h2>
          <span className="small muted">
            {food.brand ? `${food.brand} · ` : ''}pro 100 {food.unit}: {fmtInt(food.per100.kcal)} kcal, E {fmtNum(food.per100.protein)} g, F {fmtNum(food.per100.fat)} g, KH{' '}
            {fmtNum(food.per100.carbs)} g
          </span>
        </div>
        <button className={`star ${fav ? 'on' : ''}`} aria-label="Favorit" onClick={() => toggleFoodFav(food.id)}>
          {fav ? '★' : '☆'}
        </button>
      </div>

      <div className="amount-row">
        <NumInput decimal className="num big-num" value={qty} onChange={setQty} ariaLabel="Menge" />
        <div className="chips unit-chips">
          {portions.map((p) => (
            <button
              key={p.label}
              className={`chip-btn ${unit === p.label ? 'on' : ''}`}
              onClick={() => {
                if (unit !== p.label) setQty(1)
                setUnit(p.label)
              }}
            >
              {p.label} <small>{fmtNum(p.g)}</small>
            </button>
          ))}
          <button
            className={`chip-btn ${!portion ? 'on' : ''}`}
            onClick={() => {
              if (portion) setQty(Math.round(amount))
              setUnit(food.unit)
            }}
          >
            {food.unit}
          </button>
        </div>
      </div>

      <div className="preview-macros">
        <div>
          <b>{fmtInt(m.kcal)}</b>
          <span>kcal</span>
        </div>
        <div className="m-protein">
          <b>{fmtNum(m.protein)}</b>
          <span>Eiweiß</span>
        </div>
        <div className="m-fat">
          <b>{fmtNum(m.fat)}</b>
          <span>Fett</span>
        </div>
        <div className="m-carbs">
          <b>{fmtNum(m.carbs)}</b>
          <span>KH</span>
        </div>
      </div>

      <div className="seg small-seg">
        {MEALS.map((x) => (
          <button key={x.id} className={meal === x.id ? 'on' : ''} onClick={() => setMeal(x.id)}>
            {x.short}
          </button>
        ))}
      </div>

      <div className="form-row">
        <button className="btn primary grow" onClick={save} disabled={!amount}>
          {entry ? 'Speichern' : `Zu ${mealLabel(meal)} hinzufügen`}
        </button>
      </div>
      <div className="form-row">
        <button className="btn ghost" onClick={onCancel}>
          {entry ? 'Abbrechen' : 'Zurück'}
        </button>
        {entry && (
          <button
            className="btn danger ghost"
            onClick={() => {
              removeFoodEntry(entry.id)
              onDone()
            }}
          >
            Löschen
          </button>
        )}
      </div>
    </div>
  )
}

/** Eigenes Lebensmittel anlegen, z. B. wenn der Barcode unbekannt ist */
function CustomFoodForm({ barcode, name: name0, onSaved, onCancel }: { barcode?: string; name?: string; onSaved: (f: Food) => void; onCancel: () => void }) {
  const { saveFood } = useStore()
  const [name, setName] = useState(name0 ?? '')
  const [brand, setBrand] = useState('')
  const [unit, setUnit] = useState<'g' | 'ml'>('g')
  const [v, setV] = useState<Record<'kcal' | 'protein' | 'fat' | 'carbs', number | null>>({ kcal: null, protein: null, fat: null, carbs: null })
  const [pLabel, setPLabel] = useState('Portion')
  const [pG, setPG] = useState<number | null>(null)

  const kcal = v.kcal ?? Math.round((v.protein ?? 0) * 4 + (v.fat ?? 0) * 9 + (v.carbs ?? 0) * 4)
  const ok = name.trim().length > 0 && kcal > 0

  function save() {
    if (!ok) return
    const food: Food = {
      id: barcode ? `c:${barcode}` : `c:${slug(name)}-${uid()}`,
      name: name.trim(),
      brand: brand.trim() || undefined,
      barcode,
      unit,
      per100: { kcal, protein: v.protein ?? 0, fat: v.fat ?? 0, carbs: v.carbs ?? 0 },
      portions: pG ? [{ label: pLabel.trim() || 'Portion', g: pG }] : [],
      source: 'custom',
    }
    saveFood(food)
    onSaved(food)
  }

  return (
    <div className="picker">
      <h2>Eigenes Lebensmittel</h2>
      {barcode && <p className="small muted">Barcode {barcode}. Beim nächsten Scan findet die App es sofort.</p>}
      <p className="small muted">Werte von der Packung abschreiben, Spalte „pro 100 g“.</p>
      <label className="field">
        <span className="small muted">Name</span>
        <input className="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Proteinpudding Schoko" />
      </label>
      <label className="field">
        <span className="small muted">Marke (optional)</span>
        <input className="text" value={brand} onChange={(e) => setBrand(e.target.value)} />
      </label>
      <div className="seg small-seg">
        <button className={unit === 'g' ? 'on' : ''} onClick={() => setUnit('g')}>
          pro 100 g
        </button>
        <button className={unit === 'ml' ? 'on' : ''} onClick={() => setUnit('ml')}>
          pro 100 ml
        </button>
      </div>
      <div className="nutri-fields">
        <label>
          <span className="small muted">Kalorien (kcal)</span>
          <NumInput decimal className="num wide" value={v.kcal} placeholder={kcal ? String(kcal) : ''} onChange={(x) => setV({ ...v, kcal: x })} ariaLabel="Kalorien" />
        </label>
        <label>
          <span className="small muted">Eiweiß (g)</span>
          <NumInput decimal className="num wide" value={v.protein} onChange={(x) => setV({ ...v, protein: x })} ariaLabel="Eiweiß" />
        </label>
        <label>
          <span className="small muted">Fett (g)</span>
          <NumInput decimal className="num wide" value={v.fat} onChange={(x) => setV({ ...v, fat: x })} ariaLabel="Fett" />
        </label>
        <label>
          <span className="small muted">Kohlenhydrate (g)</span>
          <NumInput decimal className="num wide" value={v.carbs} onChange={(x) => setV({ ...v, carbs: x })} ariaLabel="Kohlenhydrate" />
        </label>
        <label>
          <span className="small muted">Portion (optional)</span>
          <input className="text" value={pLabel} onChange={(e) => setPLabel(e.target.value)} />
        </label>
        <label>
          <span className="small muted">Portion in {unit}</span>
          <NumInput decimal className="num wide" value={pG} onChange={setPG} ariaLabel="Portionsgröße" />
        </label>
      </div>
      <div className="form-row">
        <button className="btn primary grow" disabled={!ok} onClick={save}>
          Speichern und weiter
        </button>
        <button className="btn ghost" onClick={onCancel}>
          Abbrechen
        </button>
      </div>
    </div>
  )
}

/** Nur Kalorien und Makros eintragen, ohne Lebensmittel */
function QuickAdd({ date, meal: meal0, onDone, onCancel }: { date: string; meal: Meal; onDone: () => void; onCancel: () => void }) {
  const { saveFoodEntries } = useStore()
  const [name, setName] = useState('')
  const [meal, setMeal] = useState<Meal>(meal0)
  const [v, setV] = useState<Record<'kcal' | 'protein' | 'fat' | 'carbs', number | null>>({ kcal: null, protein: null, fat: null, carbs: null })
  const kcal = v.kcal ?? Math.round((v.protein ?? 0) * 4 + (v.fat ?? 0) * 9 + (v.carbs ?? 0) * 4)
  return (
    <div className="picker">
      <h2>Schnell eintragen</h2>
      <p className="small muted">Für Restaurant, Kantine oder wenn du die Werte schon kennst.</p>
      <label className="field">
        <span className="small muted">Bezeichnung (optional)</span>
        <input className="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Kantine Mittag" />
      </label>
      <div className="nutri-fields">
        <label>
          <span className="small muted">Kalorien (kcal)</span>
          <NumInput className="num wide" value={v.kcal} placeholder={kcal ? String(kcal) : ''} onChange={(x) => setV({ ...v, kcal: x })} ariaLabel="Kalorien" />
        </label>
        <label>
          <span className="small muted">Eiweiß (g)</span>
          <NumInput decimal className="num wide" value={v.protein} onChange={(x) => setV({ ...v, protein: x })} ariaLabel="Eiweiß" />
        </label>
        <label>
          <span className="small muted">Fett (g)</span>
          <NumInput decimal className="num wide" value={v.fat} onChange={(x) => setV({ ...v, fat: x })} ariaLabel="Fett" />
        </label>
        <label>
          <span className="small muted">Kohlenhydrate (g)</span>
          <NumInput decimal className="num wide" value={v.carbs} onChange={(x) => setV({ ...v, carbs: x })} ariaLabel="Kohlenhydrate" />
        </label>
      </div>
      <div className="seg small-seg">
        {MEALS.map((x) => (
          <button key={x.id} className={meal === x.id ? 'on' : ''} onClick={() => setMeal(x.id)}>
            {x.short}
          </button>
        ))}
      </div>
      <div className="form-row">
        <button
          className="btn primary grow"
          disabled={kcal <= 0}
          onClick={() => {
            saveFoodEntries([
              {
                id: uid(),
                date,
                meal,
                name: name.trim() || 'Schnelleintrag',
                amount: 0,
                unit: 'g',
                kcal,
                protein: v.protein ?? 0,
                fat: v.fat ?? 0,
                carbs: v.carbs ?? 0,
                at: new Date().toISOString(),
              },
            ])
            onDone()
          }}
        >
          Hinzufügen
        </button>
        <button className="btn ghost" onClick={onCancel}>
          Abbrechen
        </button>
      </div>
    </div>
  )
}

type View =
  | { kind: 'search' }
  | { kind: 'scan' }
  | { kind: 'amount'; food: Food }
  | { kind: 'custom'; barcode?: string; name?: string }
  | { kind: 'quick' }

type Tab = 'recent' | 'favs' | 'own'

/** Vollbild zum Hinzufügen: Suche, Barcode, Zuletzt, Favoriten, eigene Lebensmittel, Schnelleintrag */
export default function AddFood({ date, meal, startScan, onClose }: { date: string; meal: Meal; startScan?: boolean; onClose: () => void }) {
  const { foods, foodById, foodLog, foodFavs, toggleFoodFav, saveFood } = useStore()
  const [view, setView] = useState<View>(startScan ? { kind: 'scan' } : { kind: 'search' })
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<Tab>('recent')
  const [online, setOnline] = useState<{ q: string; foods: Food[]; error?: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const reqId = useRef(0)

  useEffect(() => {
    document.body.classList.add('sheet-open')
    return () => document.body.classList.remove('sheet-open')
  }, [])

  // Zuletzt gegessen (ohne Doppelte), neueste zuerst
  const recent = useMemo(() => {
    const out: Food[] = []
    const seen = new Set<string>()
    for (const e of [...foodLog].sort((a, b) => b.at.localeCompare(a.at))) {
      if (!e.foodId || seen.has(e.foodId)) continue
      const f = foodById(e.foodId)
      if (!f) continue
      seen.add(e.foodId)
      out.push(f)
      if (out.length >= 30) break
    }
    return out
  }, [foodLog, foodById])

  const local = useMemo(() => {
    if (q.trim().length < 2) return []
    return foods
      .map((f) => ({ f, s: matchScore(f, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.f.name.length - b.f.name.length)
      .slice(0, 30)
      .map((x) => x.f)
  }, [foods, q])

  // Online-Suche bei Open Food Facts, kurz nach dem Tippen
  useEffect(() => {
    const term = q.trim()
    if (term.length < 3) {
      setOnline(null)
      return
    }
    const id = ++reqId.current
    const t = setTimeout(async () => {
      setBusy(true)
      try {
        const res = await searchOff(term)
        if (id === reqId.current) setOnline({ q: term, foods: res })
      } catch {
        if (id === reqId.current) setOnline({ q: term, foods: [], error: 'Online-Suche gerade nicht erreichbar (kein Netz?).' })
      } finally {
        if (id === reqId.current) setBusy(false)
      }
    }, 700)
    return () => clearTimeout(t)
  }, [q])

  async function onCode(code: string) {
    setMsg(null)
    // Erst lokal (eigene und bereits gescannte Produkte), dann Open Food Facts
    const known = foods.find((f) => f.barcode === code)
    if (known) {
      setView({ kind: 'amount', food: known })
      return
    }
    setView({ kind: 'search' })
    setBusy(true)
    setMsg(`Suche Barcode ${code} …`)
    try {
      const r = await lookupBarcode(code)
      if ('food' in r) {
        saveFood(r.food)
        setMsg(null)
        setView({ kind: 'amount', food: r.food })
      } else {
        setMsg('incomplete' in r ? 'Das Produkt ist bekannt, aber ohne Nährwerte. Trag sie einmal von der Packung ein.' : 'Barcode nicht gefunden. Leg das Produkt einmal selbst an.')
        setView({ kind: 'custom', barcode: code, name: 'incomplete' in r ? r.name : undefined })
      }
    } catch {
      setMsg('Keine Verbindung zur Lebensmittel-Datenbank. Versuch es gleich nochmal oder leg das Produkt selbst an.')
    } finally {
      setBusy(false)
    }
  }

  const ownFoods = foods.filter((f) => f.source === 'custom')
  const favFoods = foodFavs.map((id) => foodById(id)).filter((f): f is Food => !!f)
  const pick = (food: Food) => setView({ kind: 'amount', food })
  const row = (f: Food) => <FoodRow key={f.id} food={f} onPick={() => pick(f)} fav={foodFavs.includes(f.id)} onFav={() => toggleFoodFav(f.id)} />

  const onlineFoods = online?.foods.filter((f) => !local.some((l) => l.id === f.id)) ?? []

  return (
    <div className="sheet" role="dialog" aria-label="Lebensmittel hinzufügen">
      <div className="sheet-top">
        <h1>{mealLabel(meal)}</h1>
        <button className="btn tiny ghost" aria-label="Schließen" onClick={onClose}>
          ✕
        </button>
      </div>

      {view.kind === 'scan' && <BarcodeScanner onCode={onCode} onClose={() => setView({ kind: 'search' })} />}

      {view.kind === 'amount' && <AmountPicker food={view.food} meal={meal} date={date} onDone={onClose} onCancel={() => setView({ kind: 'search' })} />}

      {view.kind === 'custom' && (
        <>
          {msg && <p className="note-box">{msg}</p>}
          <CustomFoodForm
            barcode={view.barcode}
            name={view.name}
            onSaved={(f) => {
              setMsg(null)
              setView({ kind: 'amount', food: f })
            }}
            onCancel={() => {
              setMsg(null)
              setView({ kind: 'search' })
            }}
          />
        </>
      )}

      {view.kind === 'quick' && <QuickAdd date={date} meal={meal} onDone={onClose} onCancel={() => setView({ kind: 'search' })} />}

      {view.kind === 'search' && (
        <>
          <div className="search-row">
            <input className="text search" type="search" placeholder="Lebensmittel suchen, z. B. Apfel, Skyr" value={q} onChange={(e) => setQ(e.target.value)} autoFocus={!startScan} enterKeyHint="search" />
            <button className="btn primary scan-btn" aria-label="Barcode scannen" onClick={() => setView({ kind: 'scan' })}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M17 8v8" />
              </svg>
            </button>
          </div>
          {msg && <p className="note-box">{msg}</p>}

          {q.trim().length >= 2 ? (
            <>
              {local.length > 0 && (
                <section className="card list-card">
                  <h3>In der App</h3>
                  <ul className="food-list">{local.map(row)}</ul>
                </section>
              )}
              <section className="card list-card">
                <h3>Open Food Facts {busy && <span className="small muted">· sucht …</span>}</h3>
                {q.trim().length < 3 && <p className="small muted">Ab 3 Buchstaben wird auch online gesucht.</p>}
                {online?.error && <p className="small muted">{online.error}</p>}
                {online && !online.error && onlineFoods.length === 0 && !busy && <p className="small muted">Nichts gefunden.</p>}
                {onlineFoods.length > 0 && <ul className="food-list">{onlineFoods.map(row)}</ul>}
              </section>
              <div className="form-row">
                <button className="btn" onClick={() => setView({ kind: 'custom', name: q.trim() })}>
                  ＋ „{q.trim()}“ selbst anlegen
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="seg small-seg">
                <button className={tab === 'recent' ? 'on' : ''} onClick={() => setTab('recent')}>
                  Zuletzt
                </button>
                <button className={tab === 'favs' ? 'on' : ''} onClick={() => setTab('favs')}>
                  ★ Favoriten
                </button>
                <button className={tab === 'own' ? 'on' : ''} onClick={() => setTab('own')}>
                  Eigene
                </button>
              </div>
              <section className="card list-card">
                {tab === 'recent' &&
                  (recent.length ? <ul className="food-list">{recent.map(row)}</ul> : <p className="small muted">Hier erscheint, was du schon eingetragen hast. Such oben oder scanne einen Barcode.</p>)}
                {tab === 'favs' &&
                  (favFoods.length ? <ul className="food-list">{favFoods.map(row)}</ul> : <p className="small muted">Tippe auf ☆ bei einem Lebensmittel, dann steht es hier.</p>)}
                {tab === 'own' && (ownFoods.length ? <ul className="food-list">{ownFoods.map(row)}</ul> : <p className="small muted">Noch keine eigenen Lebensmittel.</p>)}
              </section>
              <div className="form-row">
                <button className="btn grow" onClick={() => setView({ kind: 'custom' })}>
                  ＋ Eigenes Lebensmittel
                </button>
                <button className="btn grow" onClick={() => setView({ kind: 'quick' })}>
                  ⚡ Schnell eintragen
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

