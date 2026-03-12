# Cercetare prin Creație — Proiect cu Obiect Personal

Aplicație web statică pentru un flux strict de cercetare prin creație:
1. creezi proiectul,
2. setezi obiectul personal,
3. încarci 3 fotografii în ordine (cadru natural, neutru, controlat),
4. completezi întrebările secvențial pentru fiecare fotografie.

## Ce face aplicația
- Creează și salvează un proiect (nume, obiect personal, descriere).
- Forțează ordinea cadrelor foto: următorul cadru se deblochează doar după finalizarea celui curent.
- Pentru fiecare fotografie:
  - răspunsuri obligatorii la 8 întrebări (în ordine, fără skip),
  - înregistrare audio per întrebare,
  - transcriere text (manual sau dictare vocală când browserul suportă Web Speech API),
  - blocare la întrebarea următoare până nu există text + audio pentru întrebarea curentă.
- Păstrează audio în `IndexedDB` și restul datelor în `localStorage`.
- Exportă proiectul în `.json` cu fotografii și audio incluse ca Data URL.

## Rulare locală
```bash
python3 -m http.server 4173
```
Deschide apoi `http://localhost:4173`.

## Notă importantă despre transcriere
Transcrierea automată depinde de browser (`SpeechRecognition` / `webkitSpeechRecognition`).
Dacă nu este disponibilă, poți completa textul manual, iar fișierul audio rămâne salvat.
