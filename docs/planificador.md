# Planificador del curso

Pon la fecha de inicio, la de fin y los días sin clase. El planificador reparte las 200 sesiones del programa en tu calendario, te dice si sobran o faltan semanas y qué bloques caben.

!!! info "Dónde se guarda"
    Lo que escribes aquí se guarda **solo en este navegador**, no en la web. Si cambias de ordenador o de navegador, usa **Exportar configuración** y luego **Importar** en el otro. Si borras los datos del navegador, se pierde.

<div id="planificador" class="planificador" markdown="0">

<form id="pl-form" class="pl-panel" autocomplete="off" onsubmit="return false">
  <fieldset>
    <legend>1 · Fechas del club</legend>
    <div class="pl-fila">
      <label>Primer día <input type="date" id="pl-inicio" required></label>
      <label>Último día <input type="date" id="pl-fin" required></label>
    </div>
    <div class="pl-fila pl-dias" role="group" aria-label="Días de club">
      <span class="pl-etiqueta">Días de club:</span>
      <label><input type="checkbox" value="1"> L</label>
      <label><input type="checkbox" value="2"> M</label>
      <label><input type="checkbox" value="3"> X</label>
      <label><input type="checkbox" value="4"> J</label>
      <label><input type="checkbox" value="5"> V</label>
    </div>
    <label class="pl-check"><input type="checkbox" id="pl-semana0"> La primera semana es <a href="fase-5/preparacion.md">semana 0</a> (inscripciones y preparación, sin sesiones)</label>
  </fieldset>

  <fieldset>
    <legend>2 · Días sin clase</legend>
    <p class="pl-ayuda">Festivos, vacaciones, excursiones… Para un solo día, deja vacío «hasta».</p>
    <div id="pl-festivos"></div>
    <div class="pl-fila">
      <button type="button" class="md-button" id="pl-add">Añadir día o periodo</button>
      <button type="button" class="md-button" id="pl-sugerir">Sugerir festivos de EE. UU. y Semana Santa</button>
    </div>
  </fieldset>

  <fieldset>
    <legend>3 · Cómo repartir</legend>
    <label class="pl-radio"><input type="radio" name="pl-modo" value="semanas"> <strong>Por semanas</strong> (recomendado): cada semana del programa ocupa una semana del calendario. Si faltan días, la sesión del viernes (misión) se mantiene y se quita una del medio.</label>
    <label class="pl-radio"><input type="radio" name="pl-modo" value="seguido"> <strong>Seguido</strong>: cada sesión va al siguiente día de club, sin perder ninguna. El lunes ya no coincide siempre con «Descubre».</label>
    <label class="pl-fila">Una semana con menos de
      <select id="pl-mindias"><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select>
      días de club no empieza semana nueva (se usa para repaso o <a href="fase-5/plan-b.md">plan B</a>).</label>
  </fieldset>

  <fieldset>
    <legend>4 · Qué semanas del programa se dan</legend>
    <p class="pl-ayuda" id="pl-auto-estado"></p>
    <label class="pl-fila">El mes 10 (Zootrópolis), si cabe, va
      <select id="pl-mes10">
        <option value="entre">entre el mes 8 y el 9 (recomendado)</option>
        <option value="final">al final</option>
      </select>
    </label>
    <div id="pl-bloques" class="pl-bloques"></div>
  </fieldset>

  <div class="pl-fila pl-acciones">
    <button type="button" class="md-button md-button--primary" id="pl-imprimir">Imprimir calendario</button>
    <button type="button" class="md-button" id="pl-csv">Descargar CSV</button>
    <button type="button" class="md-button" id="pl-ics">Descargar para Google Calendar (.ics)</button>
    <button type="button" class="md-button" id="pl-exportar">Exportar configuración</button>
    <label class="md-button pl-importar">Importar configuración <input type="file" id="pl-importar" accept="application/json,.json" hidden></label>
    <button type="button" class="md-button" id="pl-reset">Empezar de cero</button>
  </div>
</form>

<section id="pl-resumen" class="pl-resumen" aria-live="polite"></section>
<section id="pl-calendario" class="pl-calendario"></section>

</div>

<script type="application/json" id="sesiones-json">[]</script>
