// ============================================================
// Lex100 Helper - content.js
// Este archivo se inyecta automáticamente dentro de la página
// de Lex100 mientras la estás mirando. No modifica datos de la
// causa: sólo lee lo que ya está en pantalla, prepara un panel
// flotante y permite abrir documentos mediante la acción original
// de Lex100.
// ============================================================

(function () {
  "use strict";

  // -----------------------------------------------------------
  // 1) Qué grupos de intervinientes vamos a buscar.
  //    "key" tiene que coincidir con el id real de la tabla en
  //    el HTML de Lex100 (ver GRUPO_KEY más abajo). "label" es
  //    el título que se muestra en el panel.
  // -----------------------------------------------------------
  const GRUPOS = [
    { key: "Imputados", label: "Imputado/a" },
    { key: "Denunciantes", label: "Denunciante / Damnificado" },
    { key: "Otros", label: "Otro interviniente" },
  ];

  // -----------------------------------------------------------
  // 1.1) De todas las columnas que trae Lex100 (Localidad, Estado
  //      procesal, Internado, Id. Reservada, Funcionario, Dom.Inv,
  //      etc.), solo nos interesa mostrar estas. Si en el futuro
  //      querés agregar o sacar alguna, es simplemente sumar o
  //      borrar un texto de esta lista.
  // -----------------------------------------------------------
  const CAMPOS_VISIBLES = ["Domicilio", "Detenido"];

  // -----------------------------------------------------------
  // 1.2) Documentos de Actuaciones.
  //
  //      La tabla de Actuaciones es paginada y el acceso al PDF
  //      se hace mediante una acción de formulario de Lex100.
  //      Estas constantes permiten reconocer esas partes sin
  //      depender de la posición visual de la pantalla.
  // -----------------------------------------------------------
  const ACTUACIONES_TABLE_SUFFIX = "actuacionExpListTable";
  const ACTUACIONES_TAB_SUFFIX = "vistaGlobalExpGroupTab_lbl";
  const PAGINA_ACTUACIONES = 30;
  const MAX_PAGINAS_ESCANEABLES = 100;
  const MAX_DOCUMENTOS_MOSTRADOS = 80;
  const SCAN_HASH_PREFIX = "#lex100-helper-scan=";
  const SCAN_SESSION_KEY = "lex100-helper-same-tab-scan";
  const SCAN_OVERLAY_ID = "lex100-helper-scan-overlay";
  const RUTA_EXPEDIENTE = "/lex100/web/expediente";
  const PDF_WINDOW_NAME = "lex100-pdf";
  const ESCANEO_MISMA_PESTANA_ESPERA_MS = 2000;
  const ESCANEO_ESTABILIZACION_MS = 600;
  const ESCANEO_PAGINADOR_ESPERA_MS = 3000;
  const INTERVINIENTES_TAB_SUFFIX = "intervinientesExpGroupTab_lbl";

  // Estas reglas son deliberadamente conservadoras. Sólo se
  // consideran coincidencias confirmadas las abreviaturas y frases
  // que identifican claramente sumario, antecedentes, indagatoria,
  // resolución de primera instancia, REJ, elevación o sentencia.
  const PATRONES_DOCUMENTOS = {
    sumario: [
      {
        etiqueta: "Sumario policial",
        regex: /\bSUMARIO\s+POLICIAL\b/,
        certeza: "exacta",
      },
      {
        etiqueta: "Sumario de inicio",
        regex: /\bSUMARIO\s+(?:DE\s+INICIO|INICIAL)\b/,
        certeza: "exacta",
      },
      {
        etiqueta: "Sumario",
        regex: /\bSUMARIO\b/,
        certeza: "exacta",
      },
    ],
    indagatoria: [
      {
        etiqueta: "Indagatoria",
        regex: /\bINDAGATORIA\b/,
        certeza: "exacta",
      },
      {
        etiqueta: "Art. 294",
        regex: /\b294\b/,
        certeza: "exacta",
      },
    ],
    resolucion_1ra_instancia: [
      {
        etiqueta: "Resolución de primera instancia",
        regex: /\bRESOLUCION\s+(?:1RA|PRIMERA|1)\s+INSTANCIA\b/,
        certeza: "exacta",
      },
      {
        etiqueta: "Procesamiento",
        regex: /\bPROCESAMIENTO\b/,
        certeza: "exacta",
      },
      {
        etiqueta: "Sobreseimiento",
        regex: /\bSOBRESEIMIENTO\b/,
        certeza: "exacta",
      },
      {
        etiqueta: "Falta de mérito",
        regex: /\bFALTA\s+DE\s+MERITO\b/,
        certeza: "exacta",
      },
    ],
    antecedentes: [
      {
        subclave: "reincidencia",
        etiqueta: "Informe de Reincidencia",
        regex: /\bINFORME\s+DE\s+REINCIDENCIA\b/,
        certeza: "exacta",
      },
      {
        subclave: "reincidencia",
        etiqueta: "Reincidencia",
        regex: /\bREINCIDENCIA\b/,
        certeza: "exacta",
      },
      {
        subclave: "reincidencia",
        etiqueta: "RNR",
        regex: /\bR\s*N\s*R\b/,
        certeza: "exacta",
      },
      {
        subclave: "planilla_prontuarial",
        etiqueta: "Planilla prontuarial",
        regex: /\bPLANILLA\s+PRONTUARIAL\b/,
        certeza: "exacta",
      },
      {
        subclave: "planilla_prontuarial",
        etiqueta: "Prontuario",
        regex: /\bPRONTUARIO\b/,
        certeza: "exacta",
      },
      {
        subclave: "planilla_prontuarial",
        etiqueta: "Informe de policía",
        regex: /\bINFORME\s+DE\s+POLICIA\b/,
        certeza: "exacta",
      },
      {
        subclave: "certificado_antecedentes",
        etiqueta: "Certificado de antecedentes",
        regex: /\bCERT(?:IFICADO)?\s+(?:DE\s+)?ANTECEDENTES\b/,
        certeza: "exacta",
      },
    ],
    elevacion: [
      { etiqueta: "REJ", regex: /\bREJ(?:\s*\d+)?\b/, certeza: "exacta" },
      {
        etiqueta: "Requerimiento de elevación",
        regex: /\bREQUERIMIENT\w*\s+(?:DE\s+)?ELEVAC\w*\b/,
        certeza: "exacta",
      },
      {
        etiqueta: "Elevación a juicio",
        regex: /\bELEVAC\w*\s+(?:A\s+)?JUICIO\b/,
        certeza: "exacta",
      },
      {
        etiqueta: "REQ ELEV",
        regex: /\bREQ\s*ELEV\b/,
        certeza: "exacta",
      },
    ],
    sentencia: [
      {
        etiqueta: "Sentencia",
        regex: /\bSENTENCIA\b/,
        certeza: "exacta",
      },
      {
        etiqueta: "Sentencia abreviada",
        regex: /\bSENT\s+[A-Z0-9]+\b/,
        certeza: "exacta",
      },
      {
        etiqueta: "Sent.",
        regex: /\bSENT\b/,
        certeza: "exacta",
      },
      {
        etiqueta: "Fallo",
        regex: /\bFALLO\b/,
        certeza: "exacta",
      },
      {
        etiqueta: "Resolución final",
        regex: /\bRESOLUCION\s+(?:FINAL|DEFINITIVA)\b/,
        certeza: "exacta",
      },
    ],
  };

  // -----------------------------------------------------------
  // 2) Lee UNA tabla de intervinientes (ej: la de Imputados) y
  //    devuelve una lista de personas con sus datos.
  //
  //    Lex100 arma cada tabla con un <thead> con las columnas
  //    (Tipo, Interviniente, Domicilio, etc.) y un <tbody> con
  //    una fila "principal" por persona, seguida de filas extra
  //    para cada "Letrado" (abogado/defensor) que tenga asignado.
  // -----------------------------------------------------------
  function extraerGrupo(groupKey) {
    // Buscamos la tabla por el FINAL de su id (no por el id
    // completo), porque Lex100 le agrega un prefijo variable
    // adelante (ej: "expediente:..."). Así, aunque cambie el
    // prefijo entre sesiones, la seguimos encontrando.
    const tabla = document.querySelector(
      `table[id$="intervinienteExpListTable${groupKey}List"]`
    );
    if (!tabla) return [];

    // Encabezados de columna, en el mismo orden que aparecen.
    const headers = Array.from(tabla.querySelectorAll("thead th")).map((th) =>
      th.textContent.trim()
    );

    const filas = Array.from(tabla.querySelectorAll("tbody tr"));
    const personas = [];
    let actual = null; // la última persona "principal" que encontramos

    filas.forEach((fila) => {
      const celdas = Array.from(fila.querySelectorAll("td")).map((td) =>
        td.textContent.trim()
      );
      if (celdas.length === 0 || celdas.every((c) => c === "")) return;

      // Las filas de "Letrado" (defensor/abogado) no tienen la
      // misma forma que las filas de persona: a veces el texto
      // "Letrado ..." cae en una columna distinta según la tabla.
      // Por eso, en vez de mirar una columna fija, buscamos si
      // CUALQUIER celda de la fila arranca con "Letrado". Si la
      // encontramos, es un defensor: guardamos solo su nombre y
      // no tocamos el resto de sus datos (así no aparece más su
      // domicilio).
      const celdaLetrado = celdas.find((c) => c.startsWith("Letrado"));
      if (celdaLetrado) {
        if (actual) {
          actual.letrados.push(celdaLetrado.replace(/^Letrado\s*/, ""));
        }
        return;
      }

      // Si no es un defensor, y tiene "Tipo" (IMPUTADO, DAMNIFICADO,
      // etc.) y nombre, es una fila principal: una persona nueva.
      const tipo = celdas[1] || "";
      const nombre = celdas[2] || "";
      if (!tipo || !nombre) return;

      actual = { tipo, nombre, datos: {}, letrados: [] };

      // Guardamos solo las columnas que están en CAMPOS_VISIBLES
      // (por ahora: Domicilio y Detenido). El resto (Localidad,
      // Estado procesal, Internado, Id. Reservada, Funcionario,
      // Dom.Inv., etc.) se ignora a propósito.
      headers.forEach((h, i) => {
        if (!CAMPOS_VISIBLES.includes(h)) return;
        const valor = celdas[i];
        if (valor) actual.datos[h] = valor;
      });

      personas.push(actual);
    });

    return personas;
  }

  // Junta los 3 grupos (Imputados, Denunciantes, Otros) en un solo objeto.
  function extraerTodo() {
    const resultado = {};
    GRUPOS.forEach((g) => {
      resultado[g.key] = extraerGrupo(g.key);
    });
    return resultado;
  }

  // -----------------------------------------------------------
  // 2.1) "Ficha de persona": es la pantalla que se abre al hacer
  //      clic en el botón amarillo de una fila (Editar Interviniente).
  //      Acá sí aparecen Número de Documento y Nacionalidad.
  // -----------------------------------------------------------

  function limpiarTexto(t) {
    return (t || "").replace(/\s+/g, " ").trim();
  }

  // Lee el valor de un <input> de texto (ej: Apellidos, Nombre, Número Doc).
  function leerInput(selector) {
    const el = document.querySelector(selector);
    return el ? limpiarTexto(el.value) : "";
  }

  // Lee la opción marcada en un <select> (ej: Nacionalidad).
  function leerSeleccionado(selector) {
    const el = document.querySelector(selector);
    if (!el) return "";
    const opcion = el.options[el.selectedIndex];
    return opcion ? limpiarTexto(opcion.textContent) : "";
  }

  // Busca un dato con forma "Etiqueta ... NO/SI" (así viene armado
  // "Detenido" en esta pantalla: el texto y el valor en negrita
  // están juntos dentro de la misma celda de tabla).
  function leerEtiquetaValor(etiqueta) {
    const celdas = Array.from(document.querySelectorAll("td"));
    for (const td of celdas) {
      const primerNodo = td.childNodes[0];
      const primerTexto = limpiarTexto(
        primerNodo && primerNodo.textContent
      );
      if (primerTexto === etiqueta) {
        const span = td.querySelector("span");
        if (span) return limpiarTexto(span.textContent);
      }
    }
    return "";
  }

  function extraerFichaPersona() {
    // Si no está el campo "Apellidos" de esta pantalla, asumimos
    // que no estamos viendo una ficha de persona (por ej. estamos
    // en la pestaña Intervinientes) y no mostramos nada de esto.
    const hayFicha = document.querySelector(
      'input[id$="apellidosDecoration:apellidos"]'
    );
    if (!hayFicha) return null;

    const apellidos = leerInput('input[id$="apellidosDecoration:apellidos"]');
    const nombre = leerInput('input[id$="nombreDecoration:nombre"]');
    const documento = leerInput(
      'input[id$="numeroDocIdDecoration:numeroDocId"]'
    );
    const nacionalidad = leerSeleccionado(
      'select[id$="nacionalidadDecoration:nacionalidad"]'
    ).replace(/^\d+\s*-\s*/, ""); // saca el "1 - " de adelante
    const detenido = leerEtiquetaValor("Detenido");

    return {
      nombreCompleto: [apellidos, nombre].filter(Boolean).join(" "),
      documento,
      nacionalidad,
      detenido,
    };
  }

  // -----------------------------------------------------------
  // 2.2) Formateo prolijo de "Letrado/s".
  //
  //      Lex100 guarda cada letrado como una línea con forma
  //      "ROL: TEXTO" (ej: "DEFENSOR OFICIAL: TASSARA LUCAS").
  //      Cuando el defensor es "oficial", Lex100 agrega una
  //      segunda línea con el mismo ROL para la dependencia a la
  //      que pertenece (ej: "DEFENSOR OFICIAL: DEFENSORIA ANTE
  //      TRIB. ORAL. EN LO CRIM. DE CAP. FED. N° 9"). Detectamos
  //      ese patrón (dos líneas seguidas con el mismo ROL) y las
  //      mostramos juntas, como persona + dependencia.
  // -----------------------------------------------------------

  // Palabras que en español van en minúscula dentro de un título
  // (salvo que sean la primera palabra).
  const PALABRAS_MINUSCULAS = new Set([
    "de", "del", "la", "el", "los", "las", "en", "lo", "y",
    "ante", "con", "por", "para", "al", "un", "una", "o", "e",
  ]);

  // Convierte un texto en MAYÚSCULA (como viene de Lex100) a un
  // formato más legible tipo "Defensoria ante Trib. Oral. en lo
  // Crim. de Cap. Fed N° 9".
  function tituloLegible(texto) {
    return texto
      .toLowerCase()
      .split(" ")
      .map((palabra, i) => {
        const limpia = palabra.replace(/[.,;:]/g, "");
        if (i > 0 && PALABRAS_MINUSCULAS.has(limpia)) return palabra;
        return palabra.charAt(0).toUpperCase() + palabra.slice(1);
      })
      .join(" ");
  }

  // Separa "DEFENSOR OFICIAL: TASSARA LUCAS" en
  // { rol: "DEFENSOR OFICIAL", texto: "TASSARA LUCAS" }.
  function separarRolYTexto(linea) {
    const idx = linea.indexOf(":");
    if (idx === -1) return { rol: "", texto: linea };
    return {
      rol: linea.slice(0, idx).trim(),
      texto: linea.slice(idx + 1).trim(),
    };
  }

  // Recibe la lista cruda de letrados y devuelve una lista de
  // "bloques" { titulo, subtitulo } listos para mostrar.
  function formatearLetrados(letrados) {
    const bloques = [];
    let i = 0;
    while (i < letrados.length) {
      const actual = separarRolYTexto(letrados[i]);
      const siguiente =
        i + 1 < letrados.length ? separarRolYTexto(letrados[i + 1]) : null;

      const titulo = actual.rol
        ? `${tituloLegible(actual.rol)}: ${tituloLegible(actual.texto)}`
        : tituloLegible(actual.texto);

      // Si la línea siguiente tiene el MISMO rol (ej: las dos dicen
      // "DEFENSOR OFICIAL"), asumimos que es la dependencia del
      // mismo defensor y la mostramos como subtítulo, debajo.
      if (siguiente && siguiente.rol && siguiente.rol === actual.rol) {
        bloques.push({ titulo, subtitulo: tituloLegible(siguiente.texto) });
        i += 2;
      } else {
        bloques.push({ titulo, subtitulo: null });
        i += 1;
      }
    }
    return bloques;
  }

  // -----------------------------------------------------------
  // 2.3) Utilidades para Actuaciones y sus documentos.
  // -----------------------------------------------------------

  function normalizarTextoBusqueda(texto) {
    return limpiarTexto(texto)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function obtenerTablaActuaciones(root) {
    if (!root) return null;
    const selector = `table[id$="${ACTUACIONES_TABLE_SUFFIX}"]`;
    if (root.matches && root.matches(selector)) return root;
    return root.querySelector(selector);
  }

  function obtenerEtiquetaPestana(suffix) {
    return document.querySelector(`[id$="${suffix}"]`);
  }

  function pestanaActiva(suffix) {
    const etiqueta = obtenerEtiquetaPestana(suffix);
    return Boolean(etiqueta && etiqueta.classList.contains("activeTab"));
  }

  function actuacionesVisibles() {
    return pestanaActiva(ACTUACIONES_TAB_SUFFIX);
  }

  function intervinientesVisibles() {
    return pestanaActiva(INTERVINIENTES_TAB_SUFFIX);
  }

  function obtenerFilaActuaciones(indice) {
    const tabla = obtenerTablaActuaciones(document);
    if (!tabla || indice < 0) return null;
    return tabla.querySelectorAll("tbody tr")[indice] || null;
  }

  function textoDeCelda(celda) {
    if (!celda) return "";
    return limpiarTexto(celda.innerText || celda.textContent || "");
  }

  function obtenerColumnasActuaciones(tabla) {
    const headers = Array.from(tabla.querySelectorAll("thead th")).map((th) =>
      limpiarTexto(th.textContent)
    );
    const buscarIndice = (patron, valorPorDefecto) => {
      const indice = headers.findIndex((header) => patron.test(header));
      return indice >= 0 ? indice : valorPorDefecto;
    };

    return {
      headers,
      fecha: buscarIndice(/fecha/i, 3),
      descripcion: buscarIndice(/descrip/i, 6),
    };
  }

  function obtenerPdfAnchor(fila) {
    if (!fila) return { anchor: null, icon: null, cell: null };

    const celdas = Array.from(fila.cells || fila.querySelectorAll("td"));
    const celdaPdf =
      celdas.find((celda) =>
        (celda.id || "").endsWith("visualizarDocumentoActuacionColumn")
      ) || celdas[celdas.length - 1];

    if (!celdaPdf) return { anchor: null, icon: null, cell: null };

    const icon = Array.from(celdaPdf.querySelectorAll("img")).find((img) => {
      const source = img.getAttribute("src") || "";
      const title = img.getAttribute("title") || "";
      const alt = img.getAttribute("alt") || "";
      return /adobe-reader-icon|pdf/i.test(`${source} ${title} ${alt}`);
    });

    const anchors = Array.from(celdaPdf.querySelectorAll("a"));
    const anchorDelIcono = icon
      ? anchors.find((anchor) => anchor.contains(icon))
      : null;

    return {
      anchor: anchorDelIcono || anchors[0] || null,
      icon: icon || null,
      cell: celdaPdf,
    };
  }

  function obtenerAccionDocumento(anchor) {
    if (!anchor) return null;
    const onclick = anchor.getAttribute("onclick") || "";

    // Lex100 usa una forma como:
    // jsfcljs(..., {'parametroDeLaFila':'parametroDeLaFila'}, '_blank')
    const patrones = [
      /parameters\s*:\s*\{\s*['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]/, 
      /jsfcljs[\s\S]*?\{\s*['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]/, 
    ];

    for (const patron of patrones) {
      const coincidencia = onclick.match(patron);
      if (!coincidencia) continue;
      const nombre = coincidencia[1];
      const valor = coincidencia[2];
      if (nombre !== "similarityGroupingId") {
        return { nombre, valor };
      }
    }

    return null;
  }

  function tieneAccionDeApertura(anchor, accion) {
    if (accion && accion.nombre && accion.valor) return true;
    return Boolean(anchor && /jsfcljs\s*\(/i.test(anchor.getAttribute("onclick") || ""));
  }

  function textoDocumentoEquivalente(primerValor, segundoValor) {
    return limpiarTexto(primerValor) === limpiarTexto(segundoValor);
  }

  function documentosCoinciden(esperado, actual) {
    if (!esperado || !actual) return false;
    if (
      esperado.descripcion &&
      !textoDocumentoEquivalente(esperado.descripcion, actual.descripcion)
    ) {
      return false;
    }
    if (
      esperado.fecha &&
      !textoDocumentoEquivalente(esperado.fecha, actual.fecha)
    ) {
      return false;
    }

    if (esperado.accion) {
      return Boolean(
        actual.accion &&
          actual.accion.nombre === esperado.accion.nombre &&
          actual.accion.valor === esperado.accion.valor
      );
    }

    return Boolean(actual.accion || actual.accionJs);
  }

  function esRutaExpediente() {
    try {
      const pathname = new URL(location.href).pathname.replace(/\/+$/, "");
      return (
        pathname === RUTA_EXPEDIENTE ||
        pathname.startsWith(`${RUTA_EXPEDIENTE}/`)
      );
    } catch (error) {
      return false;
    }
  }

  function urlSinHash(url) {
    try {
      const u = new URL(url || location.href, location.href);
      u.hash = "";
      return u.href;
    } catch (error) {
      return "";
    }
  }

  function urlConOffset(url, offset) {
    try {
      const u = new URL(url || location.href, location.href);
      u.searchParams.set("actuacionExpFirstResult", String(offset));
      u.hash = "";
      return u.href;
    } catch (error) {
      return "";
    }
  }

  function esMismaDocumento(urlA, urlB) {
    try {
      const a = new URL(urlA || location.href, location.href);
      const b = new URL(urlB || location.href, location.href);
      return (
        a.origin === b.origin &&
        a.pathname === b.pathname &&
        a.search === b.search
      );
    } catch (error) {
      return false;
    }
  }

  function navegarRecargando(url) {
    const destino = new URL(url || location.href, location.href);
    const recargar = esMismaDocumento(location.href, destino.href);
    if (recargar) {
      let urlActualizada = false;
      try {
        history.replaceState(null, "", destino.href);
        urlActualizada = true;
      } catch (error) {
        // Si no se puede cambiar la URL sin recargar, usamos replace.
      }
      if (urlActualizada) {
        window.location.reload();
      } else {
        window.location.replace(destino.href);
      }
      return;
    }
    window.location.replace(destino.href);
  }

  function navegarAHashEscaner(url, reemplazarEnHistorial = true) {
    const destino = new URL(url || location.href, location.href);
    const mismoDocumento = esMismaDocumento(location.href, destino.href);
    if (reemplazarEnHistorial) {
      window.location.replace(destino.href);
    } else {
      window.location.assign(destino.href);
    }
    if (mismoDocumento) {
      // La navegación al hash puede producir sólo un cambio de fragmento
      // cuando ya estamos en la página 0. El listener de hashchange
      // hace el trabajo; este fallback cubre el caso en que no se emita.
      setTimeout(() => {
        if (!esPestanaEscaner() || window.__lex100HelperScannerStarted) return;
        const panel = document.getElementById("lex100-helper-panel");
        if (panel) panel.remove();
        ejecutarEscaneoMismaPestana().catch(() => {});
      }, 0);
    }
  }

  function recuperarEscanerSinSesion() {
    const limpio = urlSinHash(location.href);
    let urlActualizada = false;
    try {
      history.replaceState(null, "", limpio);
      urlActualizada = true;
    } catch (error) {
      // Si no se puede quitar el hash, usamos replace como respaldo.
    }
    if (urlActualizada) {
      window.location.reload();
    } else {
      window.location.replace(limpio);
    }
  }

  function obtenerOffsetDeUrl(url) {
    try {
      const valor = Number(
        new URL(url || location.href, location.href).searchParams.get(
          "actuacionExpFirstResult"
        )
      );
      return Number.isFinite(valor) && valor >= 0 ? valor : 0;
    } catch (error) {
      return 0;
    }
  }

  function obtenerSiguientePagina(root, urlActual) {
    const siguiente = root.querySelector(
      '[id$="actuacionExpListPaginator:nextPage"]'
    );
    if (!siguiente) return "";

    const href = siguiente.getAttribute("href");
    if (!href || href.trim() === "#" || /^javascript:/i.test(href.trim())) {
      return "";
    }

    try {
      const u = new URL(href, urlActual);
      if (u.origin !== location.origin) return "";
      u.hash = "";
      return u.href;
    } catch (error) {
      return "";
    }
  }

  function obtenerUltimoOffset(root, urlActual) {
    const ultimo = root.querySelector(
      '[id$="actuacionExpListPaginator:lastPage"]'
    );
    if (!ultimo) return null;

    const href = ultimo.getAttribute("href");
    if (!href || href.trim() === "#" || /^javascript:/i.test(href.trim())) {
      return null;
    }

    try {
      const u = new URL(href, urlActual);
      if (u.origin !== location.origin) return null;
      return obtenerOffsetDeUrl(u.href);
    } catch (error) {
      return null;
    }
  }

  function esControlPaginacionInactivo(control, urlActual) {
    if (!control) return true;
    if (
      control.disabled ||
      control.hidden ||
      (control.getAttribute("aria-disabled") || "").toLowerCase() === "true"
    ) {
      return true;
    }
    const clases = control.getAttribute("class") || "";
    if (/(?:disabled|inactive|ui-state-disabled)/i.test(clases)) return true;
    const href = control.getAttribute("href");
    if (!href || href.trim() === "#" || /^javascript:/i.test(href.trim())) {
      return false;
    }
    try {
      return (
        obtenerOffsetDeUrl(new URL(href, urlActual).href) ===
        obtenerOffsetDeUrl(urlActual)
      );
    } catch (error) {
      return false;
    }
  }

  async function esperarPaginadorEstable() {
    const limite = ESCANEO_PAGINADOR_ESPERA_MS;
    const inicio = Date.now();

    while (Date.now() - inicio < limite) {
      const paginador = document.querySelector(
        '[id*="actuacionExpListPaginator"]'
      );
      if (
        paginador &&
        (paginador.querySelector("a, button, input, span") ||
          /página/i.test(paginador.textContent || ""))
      ) {
        await esperar(ESCANEO_ESTABILIZACION_MS);
        return;
      }
      await esperar(100);
    }
  }

  function tieneControlesPaginacion(root) {
    return Boolean(
      root && root.querySelector('[id*="actuacionExpListPaginator"]')
    );
  }

  function extraerDocumentosDeTabla(tabla, pageOffset, pageUrl) {
    if (!tabla) return [];

    const indices = obtenerColumnasActuaciones(tabla);
    const filas = Array.from(tabla.querySelectorAll("tbody tr"));

    return filas.map((fila, indiceFila) => {
      const celdas = Array.from(fila.cells || fila.querySelectorAll("td"));
      const pdf = obtenerPdfAnchor(fila);
      const accion = obtenerAccionDocumento(pdf.anchor);
      const accionJs = tieneAccionDeApertura(pdf.anchor, accion);
      const descripcion = textoDeCelda(celdas[indices.descripcion]);
      const fecha = textoDeCelda(celdas[indices.fecha]);
      const tipo = textoDeCelda(celdas[4]);
      const id = `${pageOffset}:${indiceFila}:${
        accion ? accion.nombre : "sin-accion"
      }`;

      let href = "";
      if (pdf.anchor && pdf.anchor.getAttribute("href")) {
        try {
          href = new URL(
            pdf.anchor.getAttribute("href"),
            pageUrl || location.href
          ).href;
        } catch (error) {
          href = "";
        }
      }

      const celdaEsPdf = Boolean(
        pdf.cell &&
          (pdf.cell.id || "").endsWith("visualizarDocumentoActuacionColumn")
      );
      const tienePdf = Boolean(pdf.anchor && (pdf.icon || celdaEsPdf));

      return {
        id,
        pageOffset,
        pageUrl: urlSinHash(pageUrl || location.href),
        rowIndex: indiceFila,
        fecha,
        tipo,
        descripcion,
        tienePdf,
        tieneIconoPdf: Boolean(pdf.icon),
        tieneAcceso: accionJs,
        accion,
        accionJs,
        href,
      };
    });
  }

  function clasificarDocumento(documento) {
    const texto = normalizarTextoBusqueda(documento.descripcion);
    const categorias = [];

    Object.entries(PATRONES_DOCUMENTOS).forEach(([clave, patrones]) => {
      const subcategoriasVistas = new Set();
      patrones.forEach((patron) => {
        if (!patron.regex.test(texto)) return;
        const subclave = patron.subclave || "";
        const identidad = `${clave}:${subclave}`;
        if (subcategoriasVistas.has(identidad)) return;
        subcategoriasVistas.add(identidad);
        const categoria = {
          clave,
          etiqueta: patron.etiqueta,
          certeza: patron.certeza,
        };
        if (subclave) categoria.subclave = subclave;
        categorias.push(categoria);
      });
    });

    return categorias;
  }

  function agregarCoincidencias(destino, documentos) {
    documentos.forEach((documento) => {
      const categorias = clasificarDocumento(documento);
      if (categorias.length === 0) return;

      const existente = destino.find((item) => item.id === documento.id);
      if (!existente) {
        destino.push({ ...documento, categorias });
        return;
      }
      categorias.forEach((categoria) => {
        if (
          !existente.categorias.some(
            (item) =>
              item.clave === categoria.clave &&
              (item.subclave || "") === (categoria.subclave || "")
          )
        ) {
          existente.categorias.push(categoria);
        }
      });
    });
  }

  function etiquetaPagina(offset) {
    return `Página ${Math.floor(offset / PAGINA_ACTUACIONES) + 1}`;
  }

  function esperar(miliseconds) {
    return new Promise((resolve) => setTimeout(resolve, miliseconds));
  }

  async function esperarCondicion(condicion, timeout = 6000) {
    const limite = Date.now() + timeout;
    while (Date.now() < limite) {
      if (condicion()) return true;
      await esperar(100);
    }
    return condicion();
  }

  async function activarPestanaActuaciones() {
    if (actuacionesVisibles() && obtenerTablaActuaciones(document)) {
      return true;
    }

    const tab = document.querySelector(
      '[id$="vistaGlobalExpGroupTab_shifted"]'
    );
    if (tab && !actuacionesVisibles()) tab.click();

    return esperarCondicion(
      () => actuacionesVisibles() && Boolean(obtenerTablaActuaciones(document))
    );
  }

  function obtenerDocumentoVivo(pageOffset, rowIndex) {
    const tabla = obtenerTablaActuaciones(document);
    if (!tabla) return null;
    return (
      extraerDocumentosDeTabla(tabla, pageOffset, location.href).find(
        (documento) => documento.rowIndex === rowIndex
      ) || null
    );
  }

  function forzarDestinoEnOnclick(onclick, destino) {
    if (!onclick || !destino) return onclick || "";
    return onclick.replace(
      /(['"])\s*(?:_blank|_self)\s*\1/gi,
      `$1${destino}$1`
    );
  }

  function hacerClicEnPdfOriginal(documento, destinoForzado = null) {
    if (!documento) return false;
    const destino =
      destinoForzado === true
        ? "_self"
        : typeof destinoForzado === "string"
        ? destinoForzado
        : "";
    const fila = obtenerFilaActuaciones(Number(documento.rowIndex));
    const pdf = obtenerPdfAnchor(fila);
    if (!pdf.anchor) return false;

    const onclickOriginal = pdf.anchor.getAttribute("onclick");
    const targetOriginal = pdf.anchor.getAttribute("target");
    const baseObjetivo = document.querySelector("base[target]");
    const baseTargetOriginal = baseObjetivo
      ? baseObjetivo.getAttribute("target")
      : null;
    let onclickRestaurado = false;
    let targetRestaurado = false;
    let baseRestaurado = false;
    try {
      // No reconstruimos el POST de JSF: dejamos que Lex100 ejecute
      // el onclick original del ícono PDF. Podemos forzar el destino
      // sólo para esta acción y restaurar el atributo original después.
      if (destino) {
        pdf.anchor.setAttribute("target", destino);
        targetRestaurado = true;
        if (baseObjetivo) {
          baseObjetivo.setAttribute("target", destino);
          baseRestaurado = true;
        }
      }
      if (destino && onclickOriginal) {
        const onclickConDestino = forzarDestinoEnOnclick(
          onclickOriginal,
          destino
        );
        if (onclickConDestino !== onclickOriginal) {
          pdf.anchor.setAttribute("onclick", onclickConDestino);
          onclickRestaurado = true;
        }
      }
      pdf.anchor.click();
      return true;
    } catch (error) {
      return false;
    } finally {
      setTimeout(() => {
        try {
          if (pdf.anchor && pdf.anchor.isConnected) {
            if (onclickRestaurado) {
              pdf.anchor.setAttribute("onclick", onclickOriginal);
            }
            if (targetRestaurado) {
              if (targetOriginal === null) {
                pdf.anchor.removeAttribute("target");
              } else {
                pdf.anchor.setAttribute("target", targetOriginal);
              }
            }
          }
          if (baseRestaurado && baseObjetivo && baseObjetivo.isConnected) {
            if (baseTargetOriginal === null) {
              baseObjetivo.removeAttribute("target");
            } else {
              baseObjetivo.setAttribute("target", baseTargetOriginal);
            }
          }
        } catch (error) {
          // La navegación puede haber reemplazado el documento.
        }
      }, 0);
    }
  }

  const aperturaEstado = {
    ultimoId: null,
    ultimoMomento: 0,
  };

  function registrarAperturaDocumento(documento) {
    if (!documento) return false;
    const ahora = Date.now();
    if (
      aperturaEstado.ultimoId === documento.id &&
      ahora - aperturaEstado.ultimoMomento < 3000
    ) {
      return false;
    }
    aperturaEstado.ultimoId = documento.id;
    aperturaEstado.ultimoMomento = ahora;
    return true;
  }

  function abrirDocumento(documento) {
    if (!documento || !registrarAperturaDocumento(documento)) return;

    const offsetActual = obtenerOffsetDeUrl(location.href);
    if (actuacionesVisibles() && offsetActual === documento.pageOffset) {
      const vivo = obtenerDocumentoVivo(documento.pageOffset, documento.rowIndex);
      if (
        vivo &&
        vivo.tienePdf &&
        vivo.tieneAcceso &&
        documentosCoinciden(documento, vivo) &&
        hacerClicEnPdfOriginal(vivo, PDF_WINDOW_NAME)
      ) {
        return;
      }
    }

    const urlBase = urlConOffset(
      documento.pageUrl || location.href,
      documento.pageOffset
    );
    if (!urlBase) return;

    const pendiente = {
      offset: documento.pageOffset,
      rowIndex: documento.rowIndex,
      accion: documento.accion || null,
      accionJs: Boolean(documento.accionJs),
      descripcion: documento.descripcion || "",
      fecha: documento.fecha || "",
      auxiliary: true,
    };
    const url = new URL(urlBase);
    if (url.origin !== location.origin) return;
    url.hash = `lex100-helper-open=${encodeURIComponent(
      JSON.stringify(pendiente)
    )}`;

    cache.documentos.mensaje =
      "Abriendo el PDF en una pestaña nueva…";
    renderPanel(cache.datos || {}, cache.ficha);
    window.open(url.href, "_blank");
  }

  function leerAperturaPendiente() {
    const prefijo = "#lex100-helper-open=";
    if (!location.hash.startsWith(prefijo)) return null;

    try {
      return JSON.parse(decodeURIComponent(location.hash.slice(prefijo.length)));
    } catch (error) {
      return null;
    }
  }

  function limpiarHashAperturaPendiente() {
    try {
      history.replaceState(null, "", urlSinHash(location.href));
    } catch (error) {
      // Si el navegador no permite modificar el hash, no afecta la
      // seguridad de la validación del documento.
    }
  }

  function cerrarPestanaAuxiliar() {
    try {
      window.close();
    } catch (error) {
      // Si el navegador no permite cerrar, se reemplaza por blank.
    }
    setTimeout(() => {
      try {
        if (!window.closed) window.location.replace("about:blank");
      } catch (error) {
        // La pestaña auxiliar ya pudo cerrarse.
      }
    }, 250);
  }

  async function atenderAperturaPendiente() {
    if (!esRutaExpediente()) return;
    const pendiente = leerAperturaPendiente();
    if (!pendiente || window.__lex100HelperPendingBusy) return;

    const esAuxiliar = Boolean(pendiente.auxiliary && window.opener);
    window.__lex100HelperPendingBusy = true;
    try {
      const activa = await activarPestanaActuaciones();
      if (!activa) {
        if (esAuxiliar) cerrarPestanaAuxiliar();
        else limpiarHashAperturaPendiente();
        return;
      }

      const offsetSolicitado = Number(pendiente.offset) || 0;
      if (obtenerOffsetDeUrl(location.href) !== offsetSolicitado) {
        if (esAuxiliar) cerrarPestanaAuxiliar();
        else limpiarHashAperturaPendiente();
        return;
      }

      const documentoEsperado = {
        descripcion: pendiente.descripcion || "",
        fecha: pendiente.fecha || "",
        accion: pendiente.accion || null,
        accionJs: Boolean(pendiente.accionJs),
      };
      let documento = null;
      const documentoDisponible = await esperarCondicion(() => {
        documento = obtenerDocumentoVivo(
          offsetSolicitado,
          Number(pendiente.rowIndex) || 0
        );
        return Boolean(
          documento &&
            documento.tienePdf &&
            documento.tieneAcceso &&
            (documentoEsperado.accion || documentoEsperado.accionJs) &&
            documentosCoinciden(documentoEsperado, documento)
        );
      }, 8000);

      if (!documentoDisponible || !documento) {
        if (esAuxiliar) cerrarPestanaAuxiliar();
        else limpiarHashAperturaPendiente();
        return;
      }

      const paginaOrigen = urlSinHash(location.href);
      const destinoPdf = PDF_WINDOW_NAME;
      if (hacerClicEnPdfOriginal(documento, destinoPdf)) {
        try {
          history.replaceState(null, "", paginaOrigen);
        } catch (error) {
          // Si no se puede limpiar el hash, la apertura ya ocurrió.
        }
        if (esAuxiliar) {
          setTimeout(() => {
            const sigueEnLex100 =
              urlSinHash(location.href) === paginaOrigen ||
              Boolean(
                document.querySelector(".colorCaratula") ||
                  document.querySelector('[id*="actuacionExpListTable"]')
              );
            if (sigueEnLex100) cerrarPestanaAuxiliar();
          }, 1500);
        }
      } else if (esAuxiliar) {
        cerrarPestanaAuxiliar();
      } else {
        limpiarHashAperturaPendiente();
      }
    } finally {
      window.__lex100HelperPendingBusy = false;
    }
  }

  function cancelarEscaneoDocumentos() {
    const sesion = leerSesionEscaneo();
    if (
      sesion &&
      sesion.token &&
      (sesion.status === "scanning" || sesion.status === "waiting")
    ) {
      sesion.status = "cancelled";
      sesion.cancelRequested = true;
      sesion.error = "Escaneo cancelado por el usuario.";
      guardarSesionEscaneo(sesion);
      scanState.running = false;
      scanState.autoDisabled = true;
      navegarRecargando(sesion.returnUrl || urlSinHash(location.href));
      return;
    }

    if (!scanState.running) return;
    scanState.autoDisabled = true;
    scanState.running = false;
    cache.documentos.estado = cache.documentos.pagesScanned
      ? "partial"
      : "idle";
    cache.documentos.verificadoCompleto = false;
    cache.documentos.error = "Escaneo cancelado.";
    cache.documentos.mensaje = "";
    renderPanel(cache.datos || {}, cache.ficha);
  }

  // -----------------------------------------------------------
  // 2.4) Escaneo de todas las páginas de Actuaciones.
  // -----------------------------------------------------------

  function nuevoEstadoDocumentos(causaId = null) {
    return {
      causaId,
      estado: "idle",
      verificadoCompleto: false,
      pageOffset: null,
      pagesScanned: 0,
      totalPages: null,
      totalRows: 0,
      documentsWithPdf: 0,
      matches: [],
      error: "",
      mensaje: "",
    };
  }

  function programarEscaneoAutomatico() {
    clearTimeout(scanState.autoTimer);
    if (
      !esRutaExpediente() ||
      esPestanaEscaner() ||
      leerAperturaPendiente() ||
      !cache.causaId ||
      scanState.running ||
      scanState.intervinientesRunning ||
      scanState.autoDisabled ||
      cache.documentos.estado === "complete" ||
      !actuacionesVisibles() ||
      !obtenerTablaActuaciones(document)
    ) {
      return;
    }

    // La lectura automática sólo inspecciona el DOM que ya está
    // cargado. No hace fetch ni recorre páginas: Lex100 mantiene una
    // conversación JSF y las peticiones rápidas pueden cerrar la
    // sesión o devolverla al inicio.
    const offsetActual = obtenerOffsetDeUrl(location.href);
    if (
      cache.documentos.estado === "current" &&
      cache.documentos.pageOffset === offsetActual
    ) {
      return;
    }

    scanState.autoTimer = setTimeout(() => {
      if (
        !scanState.running &&
        !scanState.intervinientesRunning &&
        !scanState.autoDisabled &&
        cache.documentos.estado !== "complete"
      ) {
        escanearPaginaActual();
      }
    }, 1200);
  }

  function esPestanaEscaner() {
    return location.hash.startsWith(SCAN_HASH_PREFIX);
  }

  function obtenerTokenEscaner() {
    if (!esPestanaEscaner()) return "";
    try {
      return decodeURIComponent(location.hash.slice(SCAN_HASH_PREFIX.length));
    } catch (error) {
      return "";
    }
  }

  function crearTokenEscaner() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function escanearPaginaActual() {
    if (
      !esRutaExpediente() ||
      esPestanaEscaner() ||
      leerAperturaPendiente() ||
      !cache.causaId ||
      scanState.running ||
      scanState.intervinientesRunning ||
      !actuacionesVisibles()
    ) {
      return;
    }

    const tabla = obtenerTablaActuaciones(document);
    if (!tabla) return;

    const offset = obtenerOffsetDeUrl(location.href);
    const documentos = extraerDocumentosDeTabla(tabla, offset, location.href);
    const ultimoOffset = obtenerUltimoOffset(document, location.href);
    const estado = nuevoEstadoDocumentos(cache.causaId);
    estado.estado = "current";
    estado.verificadoCompleto = false;
    estado.pageOffset = offset;
    estado.pagesScanned = 1;
    estado.totalRows = documentos.length;
    estado.documentsWithPdf = documentos.filter(
      (documento) => documento.tienePdf
    ).length;
    if (ultimoOffset !== null) {
      estado.totalPages =
        Math.floor(ultimoOffset / PAGINA_ACTUACIONES) + 1;
    }
    agregarCoincidencias(estado.matches, documentos);
    cache.documentos = estado;
    renderPanel(cache.datos || {}, cache.ficha);
  }

  function leerSesionEscaneo() {
    try {
      const valor = JSON.parse(sessionStorage.getItem(SCAN_SESSION_KEY) || "null");
      return valor && typeof valor === "object" ? valor : null;
    } catch (error) {
      return null;
    }
  }

  function guardarSesionEscaneo(sesion) {
    try {
      sessionStorage.setItem(SCAN_SESSION_KEY, JSON.stringify(sesion));
      return true;
    } catch (error) {
      // La sesión de escaneo es temporal y local a la pestaña.
      return false;
    }
  }

  function borrarSesionEscaneo() {
    try {
      sessionStorage.removeItem(SCAN_SESSION_KEY);
    } catch (error) {
      // Ignorar si el navegador no permite limpiar sessionStorage.
    }
  }

  function mostrarOverlayEscaneo(sesion) {
    if (!document.body) return;
    let overlay = document.getElementById(SCAN_OVERLAY_ID);
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = SCAN_OVERLAY_ID;
      overlay.style.cssText =
        "position:fixed;z-index:1000000;top:12px;left:50%;transform:translateX(-50%);padding:10px 12px;background:#1a3c6e;color:#fff;border-radius:6px;box-shadow:0 3px 12px rgba(0,0,0,.3);font:13px Arial,sans-serif;display:flex;gap:12px;align-items:center;";
      const texto = document.createElement("span");
      texto.id = "lex100-helper-scan-overlay-text";
      const cancelar = document.createElement("button");
      cancelar.type = "button";
      cancelar.textContent = "Cancelar";
      cancelar.style.cssText =
        "border:1px solid #fff;border-radius:4px;background:transparent;color:#fff;padding:4px 8px;cursor:pointer;font:12px Arial,sans-serif;";
      const tokenEsperado = sesion.token;
      cancelar.addEventListener("click", () => {
        const actual = leerSesionEscaneo();
        if (!actual || actual.token !== tokenEsperado) return;
        actual.status = "cancelled";
        actual.cancelRequested = true;
        actual.error = "Escaneo cancelado por el usuario.";
        guardarSesionEscaneo(actual);
        navegarRecargando(actual.returnUrl || urlSinHash(location.href));
      });
      overlay.appendChild(texto);
      overlay.appendChild(cancelar);
      document.body.appendChild(overlay);
    }
    const texto = document.getElementById("lex100-helper-scan-overlay-text");
    if (texto) {
      const total = sesion.totalPages ? ` de ${sesion.totalPages}` : "";
      texto.textContent = `Verificando Actuaciones — página ${sesion.pagesScanned}${total}…`;
    }
  }

  function finalizarEscaneoMismaPestana(sesion, status, error = "") {
    const actual = leerSesionEscaneo();
    if (actual && actual.token && actual.token !== sesion.token) return;
    if (
      actual &&
      actual.token === sesion.token &&
      (actual.status === "cancelled" || actual.cancelRequested)
    ) {
      sesion = actual;
    } else {
      sesion.status = status;
      sesion.error = error;
      guardarSesionEscaneo(sesion);
    }
    const destino = sesion.returnUrl || urlSinHash(location.href);
    setTimeout(() => navegarRecargando(destino), 120);
  }

  async function ejecutarEscaneoMismaPestana() {
    if (!esRutaExpediente() || window.__lex100HelperScannerStarted) return;
    const token = obtenerTokenEscaner();
    let sesion = leerSesionEscaneo();
    if (!token || !sesion || sesion.token !== token) {
      recuperarEscanerSinSesion();
      return;
    }
    window.__lex100HelperScannerStarted = true;
    if (!Array.isArray(sesion.visited)) sesion.visited = [];
    if (!Array.isArray(sesion.matches)) sesion.matches = [];
    mostrarOverlayEscaneo(sesion);

    try {
      const activada = await activarPestanaActuaciones();
      if (!activada) {
        finalizarEscaneoMismaPestana(
          sesion,
          sesion.pagesScanned ? "partial" : "error",
          "No se encontró la tabla de Actuaciones durante la verificación."
        );
        return;
      }

      const antesDeEsperar = leerSesionEscaneo();
      if (
        !antesDeEsperar ||
        antesDeEsperar.token !== token ||
        antesDeEsperar.status === "cancelled" ||
        antesDeEsperar.cancelRequested
      ) {
        if (antesDeEsperar && antesDeEsperar.token === token) {
          sesion = antesDeEsperar;
        }
        navegarRecargando(sesion.returnUrl || urlSinHash(location.href));
        return;
      }
      sesion = antesDeEsperar;

      const tablaDisponible = await esperarCondicion(
        () => Boolean(obtenerTablaActuaciones(document)),
        10000
      );
      if (!tablaDisponible) {
        finalizarEscaneoMismaPestana(
          sesion,
          sesion.pagesScanned ? "partial" : "error",
          "No se encontró la tabla de Actuaciones durante la verificación."
        );
        return;
      }

      // La tabla puede aparecer antes que el paginador. Esperamos a que
      // Lex100 termine de insertarlo antes de decidir que es la última.
      await esperarPaginadorEstable();
      const sesionActual = leerSesionEscaneo();
      if (!sesionActual || sesionActual.token !== token) {
        navegarRecargando(sesion.returnUrl || urlSinHash(location.href));
        return;
      }
      sesion = sesionActual;
      if (sesion.status === "cancelled" || sesion.cancelRequested) {
        navegarRecargando(sesion.returnUrl || urlSinHash(location.href));
        return;
      }

      const tabla = obtenerTablaActuaciones(document);
      const offset = obtenerOffsetDeUrl(location.href);
      if (sesion.visited.includes(offset)) {
        finalizarEscaneoMismaPestana(
          sesion,
          "error",
          "Se detectó una repetición de páginas durante la verificación."
        );
        return;
      }

      const documentos = extraerDocumentosDeTabla(tabla, offset, location.href);
      sesion.visited.push(offset);
      sesion.pagesScanned = Number(sesion.pagesScanned) + 1 || 1;
      sesion.totalRows = Number(sesion.totalRows) + documentos.length || documentos.length;
      sesion.documentsWithPdf =
        Number(sesion.documentsWithPdf) +
          documentos.filter((documento) => documento.tienePdf).length || 0;
      agregarCoincidencias(sesion.matches, documentos);

      const ultimoOffset = obtenerUltimoOffset(document, location.href);
      if (ultimoOffset !== null) {
        sesion.totalPages =
          Math.floor(ultimoOffset / PAGINA_ACTUACIONES) + 1;
      }
      if (!guardarSesionEscaneo(sesion)) {
        navegarRecargando(sesion.returnUrl || urlSinHash(location.href));
        return;
      }
      mostrarOverlayEscaneo(sesion);

      const controlSiguiente = document.querySelector(
        '[id$="actuacionExpListPaginator:nextPage"]'
      );
      const controlUltimo = document.querySelector(
        '[id$="actuacionExpListPaginator:lastPage"]'
      );
      const siguienteInactivo = esControlPaginacionInactivo(
        controlSiguiente,
        location.href
      );
      const ultimoInactivo = esControlPaginacionInactivo(
        controlUltimo,
        location.href
      );
      const siguienteUrl = siguienteInactivo
        ? ""
        : obtenerSiguientePagina(document, location.href);
      if (!siguienteUrl) {
        const paginacionVisible = tieneControlesPaginacion(document);
        const ultimoOffsetInvalido =
          paginacionVisible &&
          ultimoOffset === null &&
          !ultimoInactivo &&
          !siguienteInactivo;
        if (
          (controlSiguiente && !siguienteInactivo) ||
          (ultimoOffset !== null && offset < ultimoOffset) ||
          ultimoOffsetInvalido
        ) {
          finalizarEscaneoMismaPestana(
            sesion,
            "error",
            "No se pudo confirmar el final del paginador de Actuaciones."
          );
        } else {
          finalizarEscaneoMismaPestana(sesion, "complete");
        }
        return;
      }

      if (sesion.pagesScanned >= MAX_PAGINAS_ESCANEABLES) {
        finalizarEscaneoMismaPestana(
          sesion,
          "error",
          `Se alcanzó el límite de ${MAX_PAGINAS_ESCANEABLES} páginas.`
        );
        return;
      }

      const siguienteOffset = obtenerOffsetDeUrl(siguienteUrl);
      if (sesion.visited.includes(siguienteOffset)) {
        finalizarEscaneoMismaPestana(
          sesion,
          "error",
          "Se detectó una repetición de páginas durante la verificación."
        );
        return;
      }

      await esperar(ESCANEO_MISMA_PESTANA_ESPERA_MS);
      const posterior = leerSesionEscaneo();
      if (
        !posterior ||
        posterior.token !== token ||
        posterior.status === "cancelled" ||
        posterior.cancelRequested
      ) {
        if (posterior && posterior.token === token) {
          sesion = posterior;
        }
        navegarRecargando(sesion.returnUrl || urlSinHash(location.href));
        return;
      }
      sesion = posterior;
      const siguiente = new URL(siguienteUrl);
      siguiente.hash = location.hash;
      // replace evita acumular una entrada del escáner por cada página.
      window.location.replace(siguiente.href);
    } catch (error) {
      finalizarEscaneoMismaPestana(
        sesion,
        sesion.pagesScanned ? "partial" : "error",
        "No se pudo completar la verificación en esta pestaña."
      );
    }
  }

  function restaurarEscaneoMismaPestana() {
    const sesion = leerSesionEscaneo();
    if (!sesion) return false;
    if (sesion.status === "scanning" || sesion.status === "waiting") {
      sesion.status = sesion.pagesScanned ? "partial" : "error";
      sesion.error = "La verificación se interrumpió antes de terminar.";
    }

    const estado = nuevoEstadoDocumentos(sesion.causeId);
    estado.pagesScanned = Number(sesion.pagesScanned) || 0;
    estado.totalPages = Number(sesion.totalPages) || null;
    estado.totalRows = Number(sesion.totalRows) || 0;
    estado.documentsWithPdf = Number(sesion.documentsWithPdf) || 0;
    estado.matches = Array.isArray(sesion.matches) ? sesion.matches : [];
    if (sesion.status === "complete") {
      estado.estado = "complete";
      estado.verificadoCompleto = true;
    } else if (sesion.status === "partial" || sesion.status === "cancelled") {
      estado.estado = estado.pagesScanned ? "partial" : "idle";
      estado.verificadoCompleto = false;
      estado.error = sesion.error || "La verificación quedó incompleta.";
    } else {
      estado.estado = estado.pagesScanned ? "partial" : "error";
      estado.verificadoCompleto = false;
      estado.error = sesion.error || "No se pudo completar la verificación.";
    }

    cache.documentos = estado;
    scanState.autoDisabled = true;
    scanState.running = false;
    borrarSesionEscaneo();
    return true;
  }

  async function iniciarEscaneoMismaPestana() {
    if (!esRutaExpediente() || scanState.running) return;
    if (scanState.intervinientesRunning) {
      cache.documentos.mensaje =
        "La entrada automática a Intervinientes todavía está terminando. Volvé a intentar en unos segundos.";
      renderPanel(cache.datos || {}, cache.ficha);
      return;
    }
    const causaId = obtenerIdentificadorCausa();
    if (!causaId) {
      cache.documentos.mensaje = "No se pudo identificar la causa abierta.";
      renderPanel(cache.datos || {}, cache.ficha);
      return;
    }

    const activa = await activarPestanaActuaciones();
    if (!activa) {
      cache.documentos.estado = "error";
      cache.documentos.error =
        "No se encontró la tabla de Actuaciones para iniciar la verificación.";
      renderPanel(cache.datos || {}, cache.ficha);
      return;
    }

    const base = urlConOffset(location.href, 0);
    if (!base) {
      cache.documentos.estado = "error";
      cache.documentos.error = "No se pudo preparar la URL de Actuaciones.";
      renderPanel(cache.datos || {}, cache.ficha);
      return;
    }

    const token = crearTokenEscaner();
    const returnUrl = urlConOffset(location.href, 0) || urlSinHash(location.href);
    const sesion = {
      token,
      returnUrl,
      causeId: causaId,
      visited: [],
      pagesScanned: 0,
      totalPages: null,
      totalRows: 0,
      documentsWithPdf: 0,
      matches: [],
      status: "scanning",
      error: "",
    };
    if (!guardarSesionEscaneo(sesion)) {
      const errorEstado = nuevoEstadoDocumentos(causaId);
      errorEstado.estado = "error";
      errorEstado.error =
        "No se pudo guardar el estado temporal de la verificación en esta pestaña.";
      scanState.autoDisabled = true;
      cache.documentos = errorEstado;
      renderPanel(cache.datos || {}, cache.ficha);
      return;
    }
    scanState.autoDisabled = true;
    scanState.running = true;

    const estado = nuevoEstadoDocumentos(causaId);
    estado.estado = "waiting";
    estado.mensaje = "Recorriendo Actuaciones en esta misma pestaña…";
    cache.documentos = estado;
    renderPanel(cache.datos || {}, cache.ficha);

    const url = new URL(base);
    url.hash = `${SCAN_HASH_PREFIX}${encodeURIComponent(token)}`;
    navegarAHashEscaner(url.href, false);
  }

  async function iniciarEscaneoDocumentos(forzar = false) {
    if (scanState.running) return;
    if (!forzar && cache.documentos.estado === "complete") return;
    await iniciarEscaneoMismaPestana();
  }

  function grupoIntervinientesListo(groupKey) {
    const contenedor = document.querySelector(
      `[id$="intervinienteExpListLines${groupKey}List"]`
    );
    return Boolean(
      (contenedor &&
        (contenedor.querySelector("table") ||
          contenedor.querySelector(".emptyMessage"))) ||
        document.querySelector(
          `table[id$="intervinienteExpListTable${groupKey}List"]`
        )
    );
  }

  function intervinientesListos() {
    return GRUPOS.every((grupo) => grupoIntervinientesListo(grupo.key));
  }

  function fusionarDatosIntervinientes(datosNuevos) {
    const fusionados = { ...(cache.datos || {}) };
    GRUPOS.forEach((grupo) => {
      const lista = datosNuevos && Array.isArray(datosNuevos[grupo.key])
        ? datosNuevos[grupo.key]
        : [];
      if (lista.length > 0 || !Array.isArray(fusionados[grupo.key])) {
        fusionados[grupo.key] = lista;
      }
    });
    return fusionados;
  }

  function programarIntervinientesAutomaticos() {
    clearTimeout(scanState.intervinienteTimer);
    scanState.intervinienteTimer = null;
    if (
      !esRutaExpediente() ||
      esPestanaEscaner() ||
      leerAperturaPendiente() ||
      !cache.causaId ||
      scanState.running ||
      scanState.intervinientesRunning ||
      scanState.intervinientesDone ||
      scanState.intervinientesIntentos >= 3
    ) {
      return;
    }

    scanState.intervinienteTimer = setTimeout(() => {
      scanState.intervinienteTimer = null;
      entrarIntervinientesAutomatico().catch(() => {});
    }, 900);
  }

  async function entrarIntervinientesAutomatico() {
    if (
      !esRutaExpediente() ||
      esPestanaEscaner() ||
      !cache.causaId ||
      scanState.running ||
      scanState.intervinientesDone ||
      scanState.intervinientesRunning
    ) {
      return;
    }

    const tab = document.querySelector(
      '[id$="intervinientesExpGroupTab_shifted"]'
    );
    if (!tab) {
      scanState.intervinientesDone = true;
      return;
    }

    const estabaEnActuaciones = actuacionesVisibles();
    const runId = ++scanState.intervinienteRunId;
    scanState.intervinientesIntentos += 1;
    scanState.intervinientesRunning = true;
    let datosListos = false;
    try {
      if (!intervinientesVisibles()) tab.click();
      const pestanaCargada = await esperarCondicion(
        () => intervinientesVisibles(),
        6000
      );
      datosListos = pestanaCargada
        ? await esperarCondicion(intervinientesListos, 10000)
        : false;
      if (runId !== scanState.intervinienteRunId) return;

      const datosNuevos = extraerTodo();
      const datosFusionados = fusionarDatosIntervinientes(datosNuevos);
      if (hayDatos(datosFusionados)) cache.datos = datosFusionados;

      if (estabaEnActuaciones) {
        await activarPestanaActuaciones();
      }

      if (!datosListos && scanState.intervinientesIntentos < 3) {
        clearTimeout(scanState.intervinienteTimer);
        scanState.intervinienteTimer = setTimeout(() => {
          scanState.intervinienteTimer = null;
          entrarIntervinientesAutomatico().catch(() => {});
        }, 3000);
      }
    } catch (error) {
      // La entrada a Intervinientes es opcional: un error aquí no
      // debe impedir revisar la página de Actuaciones.
    } finally {
      if (runId === scanState.intervinienteRunId) {
        scanState.intervinientesRunning = false;
        scanState.intervinientesDone =
          datosListos || scanState.intervinientesIntentos >= 3;
        renderPanel(cache.datos || {}, cache.ficha);
        // La activación puede cambiar sólo clases; programamos
        // explícitamente la lectura segura de Actuaciones.
        programarEscaneoAutomatico();
      }
    }
  }

  function limitarPosicionPanel(panel, left, top) {
    const rect = panel.getBoundingClientRect();
    const margen = 8;
    const maxLeft = Math.max(margen, window.innerWidth - rect.width - margen);
    const maxTop = Math.max(margen, window.innerHeight - rect.height - margen);
    return {
      left: Math.min(Math.max(margen, left), maxLeft),
      top: Math.min(Math.max(margen, top), maxTop),
    };
  }

  function aplicarPosicionPanel(panel, left, top) {
    const posicion = limitarPosicionPanel(panel, left, top);
    panel.style.left = `${posicion.left}px`;
    panel.style.top = `${posicion.top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    return posicion;
  }

  function aplicarPosicionInferiorDerecha(panel) {
    panel.style.left = "auto";
    panel.style.top = "auto";
    panel.style.right = "16px";
    panel.style.bottom = "16px";
  }

  function aplicarPosicionSuperiorDerecha(panel) {
    panel.style.left = "auto";
    panel.style.top = "16px";
    panel.style.right = "16px";
    panel.style.bottom = "auto";
  }

  function inicializarArrastrePanel(panel) {
    const header = panel.querySelector("#lex100-helper-header");
    if (!header) return;

    let arrastre = null;
    const finalizarArrastre = () => {
      if (!arrastre) return;
      const pointerId = arrastre.pointerId;
      arrastre = null;
      try {
        header.releasePointerCapture(pointerId);
      } catch (error) {
        // Algunos navegadores no requieren liberar el puntero.
      }
      panel.classList.remove("lex100-helper-dragging");
    };

    header.addEventListener("pointerdown", (event) => {
      const body = panel.querySelector("#lex100-helper-body");
      if (body && body.style.display === "none") return;
      if (
        event.target.closest &&
        event.target.closest("#lex100-helper-toggle")
      ) {
        return;
      }
      if (event.pointerType === "mouse" && event.button !== 0) return;

      const rect = panel.getBoundingClientRect();
      arrastre = {
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
      };
      panel.classList.add("lex100-helper-dragging");
      try {
        header.setPointerCapture(event.pointerId);
      } catch (error) {
        // El arrastre puede funcionar sin captura en algunos navegadores.
      }
      event.preventDefault();
    });

    header.addEventListener("pointermove", (event) => {
      if (!arrastre || event.pointerId !== arrastre.pointerId) return;
      event.preventDefault();
      aplicarPosicionPanel(
        panel,
        event.clientX - arrastre.offsetX,
        event.clientY - arrastre.offsetY
      );
    });

    header.addEventListener("pointerup", finalizarArrastre);
    header.addEventListener("pointercancel", finalizarArrastre);
    header.addEventListener("lostpointercapture", finalizarArrastre);

    window.addEventListener("resize", () => {
      if (!panel.isConnected) return;
      const body = panel.querySelector("#lex100-helper-body");
      if (body && body.style.display === "none") {
        aplicarPosicionInferiorDerecha(panel);
        return;
      }
      const rect = panel.getBoundingClientRect();
      aplicarPosicionPanel(panel, rect.left, rect.top);
    });

    aplicarPosicionInferiorDerecha(panel);
  }

  function crearPanel() {
    let panel = document.getElementById("lex100-helper-panel");
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = "lex100-helper-panel";
    panel.innerHTML = `
      <div id="lex100-helper-header">
        <span>⚖️ Panel de causa</span>
        <button id="lex100-helper-toggle" title="Mostrar panel" aria-expanded="false">+</button>
      </div>
      <div id="lex100-helper-body" style="display: none;"></div>
    `;
    document.body.appendChild(panel);
    inicializarArrastrePanel(panel);

    const toggle = panel.querySelector("#lex100-helper-toggle");
    const body = panel.querySelector("#lex100-helper-body");
    panel.classList.add("lex100-helper-minimized");
    const actualizarToggle = () => {
      const estaOculto = body.style.display === "none";
      toggle.textContent = estaOculto ? "+" : "–";
      toggle.title = estaOculto ? "Mostrar panel" : "Ocultar panel";
      toggle.setAttribute("aria-expanded", String(!estaOculto));
      panel.classList.toggle("lex100-helper-minimized", estaOculto);
    };

    toggle.addEventListener("click", () => {
      const estaOculto = body.style.display === "none";
      if (estaOculto) {
        aplicarPosicionSuperiorDerecha(panel);
        body.style.display = "block";
      } else {
        body.style.display = "none";
        aplicarPosicionInferiorDerecha(panel);
      }
      actualizarToggle();
    });
    actualizarToggle();

    // Los botones se renderizan varias veces; por eso usamos un
    // único listener delegado en el body del panel.
    panel
      .querySelector("#lex100-helper-body")
      .addEventListener("click", (event) => {
        const boton = event.target.closest
          ? event.target.closest("[data-lex-action]")
          : null;
        if (!boton || !panel.contains(boton)) return;

        event.preventDefault();
        event.stopPropagation();
        const accion = boton.dataset.lexAction;

        if (accion === "scan-documents") {
          iniciarEscaneoDocumentos(true).catch(() => {});
        } else if (accion === "cancel-documents") {
          cancelarEscaneoDocumentos();
        } else if (accion === "open-document") {
          const documento = cache.documentos.matches.find(
            (item) => item.id === boton.dataset.lexId
          );
          abrirDocumento(documento);
        }
      });

    return panel;
  }

  // Convierte texto a HTML seguro (evita que un nombre con
  // caracteres raros rompa el panel).
  function escapeHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
  }

  function renderGrupo(titulo, personas) {
    if (!personas || personas.length === 0) return "";

    const items = personas
      .map((p) => {
        const datosHtml = Object.entries(p.datos)
          .map(([k, v]) => {
            // Si el campo es "Detenido" y dice "SI", lo marcamos
            // con una clase especial para que se vea en rojo.
            const esDetenidoSi =
              k === "Detenido" && v.trim().toUpperCase() === "SI";
            const clase = esDetenidoSi
              ? "lex100-helper-dato lex100-helper-detenido-si"
              : "lex100-helper-dato";
            return `<div class="${clase}"><b>${escapeHtml(
              k
            )}:</b> ${escapeHtml(v)}</div>`;
          })
          .join("");

        const bloquesLetrados = formatearLetrados(p.letrados);
        const letradosHtml = bloquesLetrados.length
          ? `<div class="lex100-helper-dato">
              <b>Letrado/s:</b>
              ${bloquesLetrados
                .map(
                  (b) => `
                <div class="lex100-helper-letrado">
                  <div>${escapeHtml(b.titulo)}</div>
                  ${
                    b.subtitulo
                      ? `<div class="lex100-helper-letrado-sub">${escapeHtml(
                          b.subtitulo
                        )}</div>`
                      : ""
                  }
                </div>`
                )
                .join("")}
            </div>`
          : "";

        return `
          <div class="lex100-helper-persona">
            <div class="lex100-helper-persona-tipo">${escapeHtml(p.tipo)}</div>
            <div class="lex100-helper-persona-nombre">${escapeHtml(
              p.nombre
            )}</div>
            ${datosHtml}
            ${letradosHtml}
          </div>
        `;
      })
      .join("");

    return `<div class="lex100-helper-grupo"><h4>${escapeHtml(
      titulo
    )}</h4>${items}</div>`;
  }

  function renderFicha(ficha) {
    if (!ficha) return "";

    const esDetenidoSi = ficha.detenido.trim().toUpperCase() === "SI";
    const claseDetenido = esDetenidoSi
      ? "lex100-helper-dato lex100-helper-detenido-si"
      : "lex100-helper-dato";

    return `
      <div class="lex100-helper-grupo">
        <h4>Ficha de la persona</h4>
        <div class="lex100-helper-persona">
          <div class="lex100-helper-persona-nombre">${escapeHtml(
            ficha.nombreCompleto || "(sin nombre)"
          )}</div>
          ${
            ficha.documento
              ? `<div class="lex100-helper-dato"><b>Documento:</b> ${escapeHtml(
                  ficha.documento
                )}</div>`
              : ""
          }
          ${
            ficha.nacionalidad
              ? `<div class="lex100-helper-dato"><b>Nacionalidad:</b> ${escapeHtml(
                  ficha.nacionalidad
                )}</div>`
              : ""
          }
          ${
            ficha.detenido
              ? `<div class="${claseDetenido}"><b>Detenido:</b> ${escapeHtml(
                  ficha.detenido
                )}</div>`
              : ""
          }
        </div>
      </div>
    `;
  }

  function renderCoincidenciasDocumento(
    matches,
    clave,
    titulo,
    subclave = null,
    esSubgrupo = false,
    completo = false
  ) {
    const encontrados = matches.filter((documento) => {
      const categorias = Array.isArray(documento.categorias)
        ? documento.categorias
        : [];
      return categorias.some(
        (categoria) =>
          categoria.clave === clave &&
          (subclave === null ||
            (categoria.subclave || "") === subclave)
      );
    });
    const exactos = encontrados.filter((documento) =>
      (documento.categorias || []).some(
        (categoria) =>
          categoria.clave === clave &&
          (subclave === null ||
            (categoria.subclave || "") === subclave) &&
          categoria.certeza === "exacta"
      )
    );
    const posibles = encontrados.filter(
      (documento) => !exactos.includes(documento)
    );
    const status = exactos.length
      ? "SI"
      : posibles.length
      ? "REVISAR"
      : completo
      ? "NO"
      : "NO VERIFICADO";
    const statusClass = exactos.length
      ? "si"
      : posibles.length
      ? "review"
      : completo
      ? "no"
      : "unknown";
    const documentosAMostrar = exactos.length ? exactos : posibles;
    const items = documentosAMostrar
      .slice(0, MAX_DOCUMENTOS_MOSTRADOS)
      .map((documento) => {
        const puedeAbrirse = documento.tienePdf && documento.tieneAcceso;
        const accion = puedeAbrirse
          ? `<button type="button" class="lex100-helper-button lex100-helper-button-small" data-lex-action="open-document" data-lex-id="${escapeHtml(
              documento.id
            )}">Abrir PDF</button>`
          : `<span class="lex100-helper-document-no-pdf">Sin acceso PDF visible</span>`;
        const pagina =
          typeof documento.pageOffset === "number"
            ? etiquetaPagina(documento.pageOffset)
            : "página desconocida";

        return `
          <div class="lex100-helper-document-match">
            <div class="lex100-helper-document-description">${escapeHtml(
              documento.descripcion || "(sin descripción)"
            )}</div>
            <div class="lex100-helper-document-meta">
              <span>${escapeHtml(documento.fecha || "sin fecha")}</span>
              <span>·</span>
              <span>${escapeHtml(pagina)}</span>
            </div>
            <div class="lex100-helper-document-actions">${accion}</div>
          </div>
        `;
      })
      .join("");
    const claseGrupo = esSubgrupo
      ? "lex100-helper-document-group lex100-helper-document-subsection"
      : "lex100-helper-document-group";

    return `
      <div class="${claseGrupo}">
        <div class="lex100-helper-document-group-title">
          <span>${escapeHtml(titulo)}</span>
          <span class="lex100-helper-document-status-value lex100-helper-document-status-${statusClass}">${status}</span>
        </div>
        ${items}
      </div>
    `;
  }

  function renderDocumentos(estado) {
    const datosDocumentos = estado || nuevoEstadoDocumentos();
    const matches = Array.isArray(datosDocumentos.matches)
      ? datosDocumentos.matches
      : [];
    const escaneando =
      datosDocumentos.estado === "scanning" ||
      datosDocumentos.estado === "waiting";
    const completo =
      datosDocumentos.estado === "complete" &&
      datosDocumentos.verificadoCompleto !== false;

    let estadoTexto = "La verificación completa todavía no comenzó.";
    if (datosDocumentos.estado === "current") {
      estadoTexto =
        "Página actual revisada; verificá todas las páginas para confirmar SI/NO.";
    } else if (datosDocumentos.estado === "waiting") {
      estadoTexto = "Preparando la verificación en esta misma pestaña…";
    } else if (datosDocumentos.estado === "scanning") {
      estadoTexto = `Verificando página ${datosDocumentos.pagesScanned}${
        datosDocumentos.totalPages
          ? ` de ${datosDocumentos.totalPages}`
          : ""
      }…`;
    } else if (completo) {
      estadoTexto = "Actuaciones verificadas.";
    } else if (datosDocumentos.estado === "partial") {
      estadoTexto =
        "La verificación quedó incompleta; no se muestran resultados negativos como definitivos.";
    } else if (datosDocumentos.estado === "error") {
      estadoTexto = "No se pudo verificar todas las Actuaciones.";
    }

    const esperandoIntervinientes =
      scanState.intervinientesRunning || Boolean(scanState.intervinienteTimer);
    const botonEscaneo = escaneando
      ? `<button type="button" class="lex100-helper-button lex100-helper-button-secondary" data-lex-action="cancel-documents">Cancelar</button>`
      : esperandoIntervinientes
      ? `<button type="button" class="lex100-helper-button lex100-helper-button-secondary" disabled>Preparando Intervinientes…</button>`
      : `<button type="button" class="lex100-helper-button" data-lex-action="scan-documents">${
          completo ? "Volver a verificar" : "Verificar todas"
        }</button>`;

    const mensaje = datosDocumentos.mensaje
      ? `<div class="lex100-helper-document-message">${escapeHtml(
          datosDocumentos.mensaje
        )}</div>`
      : "";
    const error =
      datosDocumentos.error && datosDocumentos.error !== datosDocumentos.mensaje
        ? `<div class="lex100-helper-document-message">${escapeHtml(
            datosDocumentos.error
          )}</div>`
        : "";

    const antecedentesHtml = `
      <div class="lex100-helper-document-group lex100-helper-antecedentes-group">
        <div class="lex100-helper-document-group-title">
          <span>ANTECEDENTES:</span>
        </div>
        ${[
          { clave: "reincidencia", titulo: "Informe de Reincidencia:" },
          { clave: "planilla_prontuarial", titulo: "Planilla Prontuarial:" },
          {
            clave: "certificado_antecedentes",
            titulo: "Certificado de Antecedentes:",
          },
        ]
          .map((subgrupo) =>
            renderCoincidenciasDocumento(
              matches,
              "antecedentes",
              subgrupo.titulo,
              subgrupo.clave,
              true,
              completo
            )
          )
          .join("")}
      </div>
    `;

    const gruposHtml = [
      renderCoincidenciasDocumento(
        matches,
        "sumario",
        "SUMARIO:",
        null,
        false,
        completo
      ),
      antecedentesHtml,
      renderCoincidenciasDocumento(
        matches,
        "indagatoria",
        "INDAGATORIA:",
        null,
        false,
        completo
      ),
      renderCoincidenciasDocumento(
        matches,
        "resolucion_1ra_instancia",
        "RESOLUCION 1RA INSTANCIA:",
        null,
        false,
        completo
      ),
      renderCoincidenciasDocumento(
        matches,
        "elevacion",
        "REQUERIMIENTO DE ELEVACION A JUICIO:",
        null,
        false,
        completo
      ),
      renderCoincidenciasDocumento(
        matches,
        "sentencia",
        "SENTENCIA:",
        null,
        false,
        completo
      ),
    ].join("");

    return `
      <div class="lex100-helper-documentos">
        <div class="lex100-helper-document-header">
          <span>Documentos clave</span>
          ${botonEscaneo}
        </div>
        <div class="lex100-helper-document-status">${escapeHtml(
          estadoTexto
        )}</div>
        ${mensaje}
        ${error}
        ${gruposHtml}
      </div>
    `;
  }

  function renderPanel(datos, ficha) {
    if (!esRutaExpediente()) {
      const panelExistente = document.getElementById("lex100-helper-panel");
      if (panelExistente) panelExistente.remove();
      return;
    }
    const panel = crearPanel();
    const body = panel.querySelector("#lex100-helper-body");
    const datosIntervinientes = datos || {};

    const intervinientesHtml = `
      <section class="lex100-helper-intervinientes-section">
        <div class="lex100-helper-section-title">Intervinientes</div>
        ${renderFicha(ficha)}
        ${GRUPOS.map((g) =>
          renderGrupo(g.label, datosIntervinientes[g.key])
        ).join("")}
        ${
          hayDatos(datosIntervinientes)
            ? ""
            : `<p class="lex100-helper-vacio">Todavía no encontré datos de Intervinientes.</p>`
        }
      </section>
    `;

    // Intervinientes queda siempre arriba; los documentos de
    // Actuaciones quedan debajo.
    body.innerHTML = intervinientesHtml + renderDocumentos(cache.documentos);

    // El cuerpo puede cambiar de altura después de renderizar; en el
    // siguiente frame mantenemos el panel dentro de la ventana.
    requestAnimationFrame(() => {
      if (!panel.isConnected) return;
      const body = panel.querySelector("#lex100-helper-body");
      if (body && body.style.display === "none") {
        aplicarPosicionInferiorDerecha(panel);
        return;
      }
      const rect = panel.getBoundingClientRect();
      aplicarPosicionPanel(panel, rect.left, rect.top);
    });
  }

  // -----------------------------------------------------------
  // 2.3) El panel tiene que seguir mostrando la info aunque el
  //      usuario se vaya a otra pestaña (Actuaciones, Despachos,
  //      etc.), donde la tabla de Intervinientes ya no está en la
  //      página. Por eso guardamos lo último que encontramos en
  //      esta variable, y solo la "pisamos" cuando encontramos
  //      datos nuevos.
  // -----------------------------------------------------------
  const cache = {
    causaId: null,
    datos: null,
    ficha: null,
    documentos: nuevoEstadoDocumentos(),
  };

  const scanState = {
    running: false,
    autoDisabled: false,
    autoTimer: null,
    intervinientesDone: false,
    intervinientesRunning: false,
    intervinienteTimer: null,
    intervinienteRunId: 0,
    intervinientesIntentos: 0,
  };

  // Lee el número de expediente (por ejemplo, la carátula visible)
  // para darnos cuenta si el usuario abrió una causa distinta, y en ese
  // caso vaciar lo que teníamos guardado (para no mezclar datos
  // de dos expedientes distintos).
  function obtenerIdentificadorCausa() {
    const el = document.querySelector(".colorCaratula");
    return el ? limpiarTexto(el.textContent) : null;
  }

  function reiniciarEscaneoDocumentos(causaId) {
    scanState.running = false;
    scanState.autoDisabled = false;
    clearTimeout(scanState.autoTimer);
    clearTimeout(scanState.intervinienteTimer);
    scanState.intervinienteTimer = null;
    scanState.intervinientesDone = false;
    scanState.intervinientesRunning = false;
    scanState.intervinientesIntentos = 0;
    scanState.intervinienteRunId += 1;
    cache.documentos = nuevoEstadoDocumentos(causaId);
  }

  function hayDatos(datos) {
    if (!datos) return false;
    return GRUPOS.some((g) => datos[g.key] && datos[g.key].length > 0);
  }

  function actualizar() {
    if (!esRutaExpediente()) {
      const panelExistente = document.getElementById("lex100-helper-panel");
      if (panelExistente) panelExistente.remove();
      return;
    }
    const causaId = obtenerIdentificadorCausa();
    if (causaId && cache.causaId && causaId !== cache.causaId) {
      // Cambiamos de expediente: empezamos de cero.
      cache.datos = null;
      cache.ficha = null;
      reiniciarEscaneoDocumentos(causaId);
    }
    if (causaId) {
      cache.causaId = causaId;
      if (cache.documentos.causaId !== causaId) {
        cache.documentos = nuevoEstadoDocumentos(causaId);
      }
    }

    const datosNuevos = extraerTodo();
    const fichaNueva = extraerFichaPersona();

    if (hayDatos(datosNuevos)) cache.datos = datosNuevos;
    if (fichaNueva) cache.ficha = fichaNueva;

    renderPanel(cache.datos || {}, cache.ficha);
    programarIntervinientesAutomaticos();
    programarEscaneoAutomatico();
  }

  // -----------------------------------------------------------
  // 4) Lex100 es una app "de una sola página": cuando hacés clic
  //    en una pestaña (ej: Intervinientes), NO se recarga la
  //    página entera, solo cambia un pedazo del HTML por Ajax.
  //    Por eso no alcanza con leer los datos una sola vez al
  //    entrar: usamos un "observador" que vuelve a leer cada vez
  //    que algo cambia en la página.
  // -----------------------------------------------------------

  function manejarCambioHash() {
    if (!esRutaExpediente()) return;
    if (esPestanaEscaner()) {
      if (window.__lex100HelperScannerStarted) return;
      const panel = document.getElementById("lex100-helper-panel");
      if (panel) panel.remove();
      ejecutarEscaneoMismaPestana().catch(() => {});
      return;
    }
    if (leerAperturaPendiente()) {
      atenderAperturaPendiente().catch(() => {});
      return;
    }
    if (leerSesionEscaneo() && restaurarEscaneoMismaPestana()) {
      actualizar();
    }
  }

  window.addEventListener("hashchange", manejarCambioHash);

  if (esPestanaEscaner() && esRutaExpediente()) {
    // El escaneo completo se hace en la misma pestaña. No se crea
    // ninguna ventana secundaria ni se envían mensajes entre pestañas.
    ejecutarEscaneoMismaPestana().catch(() => {});
  } else {
    // Al volver del escaneo, se recuperan los resultados guardados
    // localmente en sessionStorage.
    restaurarEscaneoMismaPestana();
    atenderAperturaPendiente().catch(() => {});
    actualizar(); // primera lectura, al cargar

    const observer = new MutationObserver((mutations) => {
      // Ignoramos los cambios que genera el propio panel (para no
      // entrar en un bucle infinito de actualizaciones).
      const hayCambioReal = mutations.some(
        (m) => !(m.target.closest && m.target.closest("#lex100-helper-panel"))
      );
      if (!hayCambioReal) return;

      // Esperamos un poquito (400ms) a que termine de llegar toda
      // la respuesta del servidor antes de releer, para no hacerlo
      // a mitad de una actualización.
      clearTimeout(window.__lex100HelperTimeout);
      window.__lex100HelperTimeout = setTimeout(() => {
        if (esPestanaEscaner()) return;
        atenderAperturaPendiente().catch(() => {});
        actualizar();
      }, 400);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function comprobarRutaDeExpediente() {
    if (!esRutaExpediente()) {
      const panel = document.getElementById("lex100-helper-panel");
      if (panel) panel.remove();
      const overlay = document.getElementById(SCAN_OVERLAY_ID);
      if (overlay) overlay.remove();
      return;
    }
    if (esPestanaEscaner()) return;
    if (!document.getElementById("lex100-helper-panel")) {
      actualizar();
    }
  }

  window.addEventListener("popstate", comprobarRutaDeExpediente);
  window.addEventListener("hashchange", comprobarRutaDeExpediente);
  comprobarRutaDeExpediente();
})();
