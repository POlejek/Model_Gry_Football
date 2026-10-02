# Model_Gry_Football
## Testy

| Polecenie | Co sprawdza |
|---|---|
| `npm test` | testy jednostkowe (logika w `src/utils`) i komponentów (React Testing Library) |
| `npm run test:watch` | to samo w trybie obserwowania zmian |
| `npm run test:coverage` | pokrycie kodu; próg dla `src/utils` — 85% |
| `npm run test:e2e` | testy w prawdziwej przeglądarce (Playwright) na buildzie produkcyjnym: laptop i telefon |
| `npm run test:all` | wszystko powyżej po kolei |

Przed pierwszym `test:e2e`: `npx playwright install chromium` (dla iPhone/Safari także `webkit` i zmienna `PW_WEBKIT=1`).

Struktura:
- `src/utils/*.test.js` — czysta logika: geometria, rysowanie, animacja, zapis, import/eksport ćwiczeń.
- `src/*.test.jsx` — zachowanie komponentów z perspektywy użytkownika (klawiatura, przyciski, biblioteka, cofanie).
- `e2e/*.spec.js` — pełne scenariusze w przeglądarce; każdy test kończy się błędem, jeśli na stronie wystąpi błąd JavaScript.

CI (`.github/workflows/deploy.yml`) uruchamia testy przy każdym pushu i pull requeście; strona wdraża się tylko, gdy testy jednostkowe i E2E przejdą. Testy na iPhonie (WebKit) są na razie informacyjne i nie blokują wdrożenia.
