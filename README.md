# CINEASTRA — versión simple (HTML + CSS + JS + Supabase)

Versión estática del proyecto conectada a tu esquema SQL (tablas `pelicula`, `sala`, `funcion`, `ticket`).

## 1) Base de datos (Supabase)
1. En tu proyecto Supabase abre **SQL Editor** y ejecuta tu script `.sql` (crea tablas, FKs, índices y unicidad de asiento).
2. (Opcional) Inserta datos de prueba:
```sql
insert into pelicula (titulo, genero, duracion, clasificacion) values
('Dune: Parte Dos','Ciencia ficción, Aventura',166,'PG-13'),
('Oppenheimer','Drama, Historia',180,'R');

insert into sala (numero, capacidad) values (1, 96), (2, 80);

insert into funcion (fecha, hora, sala_id, pelicula_id) values
('2026-11-11','19:00',1,1),
('2026-11-11','21:30',2,2);
```
3. **Permisos/RLS** para que el navegador (anon key) pueda leer y comprar. Ejecuta:
```sql
alter table pelicula enable row level security;
alter table sala enable row level security;
alter table funcion enable row level security;
alter table ticket enable row level security;

create policy "pelicula_select" on pelicula for select to anon, authenticated using (true);
create policy "sala_select"    on sala    for select to anon, authenticated using (true);
create policy "funcion_select" on funcion for select to anon, authenticated using (true);
create policy "ticket_select"  on ticket  for select to anon, authenticated using (true);
create policy "ticket_insert"  on ticket  for insert to anon, authenticated with check (true);
```
> Nota: `ticket_select` abierto es solo para demo. Para producción restringe la lectura.

## 2) Configurar el frontend
Edita `assets/config.js`:
- `SUPABASE_URL` → Project Settings → API → Project URL
- `SUPABASE_ANON_KEY` → Project Settings → API → `anon`/publishable key
- `TICKET_PRICE` → precio por entrada (tu tabla `funcion` no tiene precio)

**Nunca** uses la clave `service_role` en el navegador.

## 3) Ejecutar
Abre la carpeta con un servidor local (no `file://`):
- `npx serve simple`  (o `npx serve .` dentro de `simple/`)
- o extensión **Live Server** de VS Code

Luego abre `index.html`.

## Notas del mapeo a tu esquema
- `pelicula`: usa `titulo, genero, duracion, clasificacion` (no hay póster/sinopsis/estado; se muestran placeholders).
- `sala`: usa `numero, capacidad`; el mapa de asientos se calcula automáticamente a partir de la capacidad.
- `funcion`: usa `fecha, hora, sala_id, pelicula_id`; el precio viene de `TICKET_PRICE` en `config.js`.
- `ticket`: inserta `funcion_id, asiento, precio` y la constraint `uq_ticket_asiento_funcion` evita vender el mismo asiento dos veces.
- **Mis entradas**: se consultan por IDs guardados en `localStorage` tras la compra (`cineastra_ticket_ids`), porque el esquema no tiene token de comprador.

## Archivos
- `index.html`, `cartelera.html`, `pelicula.html?id=`, `asientos.html?funcion=`, `mis-entradas.html`, `proximos.html`
- `assets/styles.css` — estilos
- `assets/config.js` — URL/key y precio
- `assets/app.js` — consultas a Supabase y lógica de UI
