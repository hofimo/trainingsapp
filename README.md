# Trainingsapp

Web-App fürs Krafttraining im Homegym: Trainingsplan (Ganzkörper A/B/C mit Arm-Fokus), Sätze mit Gewicht und Wiederholungen eintragen, automatische Steigerungsvorschläge, Pausentimer, Sätze pro Muskel und Woche, Fortschrittsdiagramme und Körpergewicht. Läuft auf dem iPhone wie eine App, auch offline. Alle Daten bleiben auf dem Handy (Backup über Einstellungen → Backup exportieren).

## Lokal starten (Mac)

Voraussetzung: Node.js 20 oder neuer (`brew install node`).

```bash
npm install
npm run dev
```

Im Browser `http://localhost:5173` öffnen. Zum Ausprobieren auf dem iPhone im selben WLAN die angezeigte „Network“-Adresse in Safari öffnen. Installieren („Zum Home-Bildschirm“ mit Offline-Funktion) geht erst über eine HTTPS-Adresse, siehe unten.

## Auf GitHub Pages veröffentlichen (für die Installation auf dem iPhone)

1. Auf github.com ein neues Repository anlegen, z. B. `trainingsapp`.
2. Im Ordner:
   ```bash
   git init -b main
   git add .
   git commit -m "Trainingsapp"
   git remote add origin https://github.com/hofimo/trainingsapp.git
   git push -u origin main
   ```
3. Im Repository unter **Settings → Pages → Source** „GitHub Actions“ wählen.
4. Nach ein bis zwei Minuten läuft die App unter `https://hofimo.github.io/trainingsapp/`.
5. Auf dem iPhone in Safari öffnen → Teilen → „Zum Home-Bildschirm“.

Jeder weitere Push auf `main` aktualisiert die App automatisch. Die Trainingsdaten auf dem Handy bleiben dabei erhalten.

## Erinnerungen (Push)

Morgens gegen 7:30 Uhr (Gewicht, Morgen-Supplements) und abends gegen 18 Uhr (was heute noch fehlt). Ein iPhone-Web-App kann keine Uhrzeit selbst planen, deshalb schickt der geplante Workflow `.github/workflows/reminders.yml` den Push; den Text baut `public/sw.js` aus den Daten auf dem Handy.

Einrichten: App vom Home-Bildschirm öffnen → Einstellungen → Erinnerungen → „Erinnerungen einschalten“ → „Code kopieren“. Dann im Repository unter **Settings → Secrets and variables → Actions** ein Secret `PUSH_CONFIG` mit dem Code anlegen. Testen: unter **Actions → Tägliche Erinnerungen → Run workflow**.

## Aufbau

- `src/defaults.ts` – Übungsliste und Startplan
- `src/progression.ts` – Steigerungsregel (doppelte Progression)
- `src/db.ts` – lokale Speicherung (IndexedDB)
- `src/views/` – Bildschirme: Heute/Training, Verlauf, Fortschritt, Körpergewicht, Plan, Einstellungen
- `public/sw.js` – Offline-Funktion und Text der Erinnerungen
- `src/push.ts`, `scripts/reminder/` – Erinnerungen per Web Push

## Steigerungsregel

Jede Übung hat einen Wiederholungsbereich (z. B. 8–12). Schaffst du in allen Sätzen das obere Ende, schlägt die App das nächstschwerere Gewicht vor, das du in den Einstellungen hinterlegt hast. Sonst zielt sie auf eine Wiederholung mehr pro Satz. Ist das schwerste Gewicht erreicht, gibt es mehr Wiederholungen und langsameres Tempo. Sinkt die Leistung zwei Einheiten hintereinander, schlägt sie einen leichteren Tag vor.
