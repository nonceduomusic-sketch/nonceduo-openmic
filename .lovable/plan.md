

## Analisi del problema

Il codice attuale usa `useStaffRole()` che **include già owner, admin, moderator e operator** nella verifica. Il termine "isStaff" nel codice copre tutti i ruoli admin, owner compreso.

Tuttavia, ci sono **2 pagine dove mancano i pulsanti staff** (Trasmetti + layout a 3 pulsanti):

1. **`src/pages/Index.tsx`** - Pagina principale: ha `useStaffRole()` ma **non passa** `isStaff` e `onBroadcast` a `SongCardWithStatus`
2. **`src/components/FreeModeOpenMic.tsx`** - Modalità libera: **non usa** `useStaffRole` e non passa `isStaff`/`onBroadcast`

Solo `src/pages/OpenMic.tsx` è stato aggiornato correttamente.

## Piano di implementazione

### 1. Aggiornare `src/pages/Index.tsx`
- Aggiungere import di `useHybridBroadcast`, `useSongs`, `useCallback`, `toast`
- Implementare `handleBroadcast` (stessa logica di OpenMic.tsx)
- Passare `isStaff={isStaff}` e `onBroadcast={handleBroadcast}` a ogni `SongCardWithStatus`

### 2. Aggiornare `src/components/FreeModeOpenMic.tsx`
- Aggiungere import di `useStaffRole`, `useHybridBroadcast`, `useSongs`, `useCallback`, `toast`
- Aggiungere gli hook nel componente
- Implementare `handleBroadcast`
- Passare `isStaff={isStaff}` e `onBroadcast={handleBroadcast}` a ogni `SongCardWithStatus`

### Nessuna modifica necessaria a
- `SongCardWithStatus.tsx` - Già supporta `isStaff` e `onBroadcast`
- `useStaffRole.ts` - Già include owner/admin/moderator/operator
- `LiveCentroTab.tsx` - Già funzionante nel pannello admin

