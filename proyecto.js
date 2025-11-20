/**
 * proyecto.js  - SMARTINVENTORY
 * - Login
 * - CRUD
 * - PDF/CSV
 * - Dashboard
 * - Escaneo Simulado
 * - Alertas Automáticas EmailJS
 */

document.addEventListener("DOMContentLoaded", () => {
  const qs = s => document.querySelector(s);
  const qsa = s => Array.from(document.querySelectorAll(s));
  const toast = (icon, title) => {
    if (window.Swal)
      Swal.fire({ toast:true, position:"top-end", icon, title, showConfirmButton:false, timer:1400 });
  };

  /* -------------------------
     LOGIN
  -------------------------*/
  const formLogin = qs("#loginForm");
  if (formLogin) {
    formLogin.addEventListener("submit", e => {
      e.preventDefault();
      const user = qs("#usuario").value.trim();
      const pass = qs("#password").value.trim();

      if (!user || !pass)
        return Swal.fire("Complete campos","Ingrese usuario y contraseña","warning");

      if (user === "admin" && pass === "1234") {
        localStorage.setItem("sesionActiva", "true");
        Swal.fire({ icon:"success", title:"Bienvenido", timer:800, showConfirmButton:false })
          .then(() => window.location="proyecto.html");
      } else {
        Swal.fire("Error","Usuario o contraseña incorrectos","error");
      }
    });
    return;
  }

  if (!localStorage.getItem("sesionActiva")) {
    window.location = "index.html";
    return;
  }

  /* -------------------------
     SELECTORES
  -------------------------*/
  const logoutBtn = qs("#logoutBtn");
  const navLinks = qsa("nav a");
  const sections = qsa("main section");

  const inventoryForm = qs("#inventoryForm");
  const codigoInput = qs("#codigo");
  const nombreInput = qs("#nombre");
  const stockInput = qs("#stock");
  const categoriaInput = qs("#categoria");
  const estadoInput = qs("#estado");
  const ubicacionInput = qs("#ubicacion");
  const encargadoInput = qs("#encargado");
  const tablaBody = qs("#tablaInventario tbody");
  const buscador = qs("#buscador");

  const totalArticulosEl = qs("#totalArticulos");
  const totalOperativosEl = qs("#totalOperativos");
  const totalInoperativosEl = qs("#totalInoperativos");

  const graficoCtx = qs("#graficoInicio");

  const btnPDF = qs("#btnPDF");
  const btnExportCSV = qs("#btnExportCSV");
  const btnExportCSVReport = qs("#btnExportCSVReport");
  const btnPDFReport = qs("#btnPDFReport");

  const tablaReporteBody = qs("#tablaReporte tbody");
  const btnScan = qs("#btnScan");

  let chart = null;

  // CONFIG
  const ALERT_THRESHOLD = 5;

  /* -------------------------
     STORAGE
  -------------------------*/
  const leer = () => JSON.parse(localStorage.getItem("inventario") || "[]");
  const guardar = arr => localStorage.setItem("inventario", JSON.stringify(arr));

  /* -------------------------
     EMAILJS – ALERTA REAL
  -------------------------*/
  async function enviarAlertaItem(item) {

    const datos = {
      codigo: item.codigo,
      nombre: item.nombre,
      categoria: item.categoria || "",
      cantidad: item.stock || 0,
      fecha: new Date().toLocaleString(),
      to_email: "gomezpizarrofreddy@gmail.com"
    };

    try {
      await emailjs.send(
        "service_v1tf8l8",
        "template_9q8ellh",
        datos
      );

      console.log("📩 Email enviado correctamente");
      Swal.fire("Correo enviado", "Revisa tu Gmail", "success");

    } catch (error) {
      console.error("❌ Error EmailJS:", error);
      Swal.fire("Error", "No se pudo enviar el correo", "error");
    }
  }

  /* -------------------------
     GENERAR CÓDIGO
  -------------------------*/
  function generarCodigo() {
    const inv = leer();
    let max = inv.reduce((a,it)=>{
      const m = (it.codigo || "").match(/INV-(\d+)/);
      return m ? Math.max(a, Number(m[1])) : a;
    }, 0);
    codigoInput.value = `INV-${String(max + 1).padStart(3,"0")}`;
  }

  /* -------------------------
     TABLA
  -------------------------*/
  function renderTabla(filter="") {
    const inv = leer();
    const list = inv.filter(i => {
      if (!filter) return true;
      const t = filter.toLowerCase();
      return [i.nombre, i.codigo, i.categoria, i.ubicacion, i.encargado]
      .some(v => (v || "").toLowerCase().includes(t));
    });

    tablaBody.innerHTML = "";
    list.forEach((i, idx) => {
      tablaBody.innerHTML += `
        <tr>
          <td>${i.codigo}</td>
          <td>${i.nombre}</td>
          <td>${i.stock}</td>
          <td>${i.categoria}</td>
          <td>${i.estado}</td>
          <td>${i.ubicacion}</td>
          <td>${i.encargado}</td>
          <td>
            <button class="btnAccion editar" data-i="${idx}">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btnAccion eliminar" data-i="${idx}">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });

    qsa(".editar").forEach(b => b.onclick = onEdit);
    qsa(".eliminar").forEach(b => b.onclick = onDelete);

    actualizarResumenYGrafico();
  }

  /* -------------------------
     CRUD
  -------------------------*/
  function onDelete(e) {
    const i = Number(e.currentTarget.dataset.i);
    const inv = leer();
    const item = inv[i];
    Swal.fire({ title:`Eliminar ${item.nombre}?`, showCancelButton:true })
    .then(r => {
      if (r.isConfirmed) {
        inv.splice(i,1);
        guardar(inv);
        renderTabla();
        toast("success","Eliminado");
      }
    });
  }

  function onEdit(e) {
    const i = Number(e.currentTarget.dataset.i);
    const inv = leer();
    const it = inv[i];

    codigoInput.value = it.codigo;
    nombreInput.value = it.nombre;
    stockInput.value = it.stock;
    categoriaInput.value = it.categoria;
    estadoInput.value = it.estado;
    ubicacionInput.value = it.ubicacion;
    encargadoInput.value = it.encargado;

    inv.splice(i,1);
    guardar(inv);
    renderTabla();
    toast("info","Edita y guarda");
  }

  /* -------------------------
     GUARDAR PRODUCTO
  -------------------------*/
  if (inventoryForm) {
    inventoryForm.addEventListener("submit", e => {
      e.preventDefault();

      const inv = leer();
      const nuevo = {
        codigo: codigoInput.value,
        nombre: nombreInput.value.trim(),
        stock: Number(stockInput.value),
        categoria: categoriaInput.value.trim(),
        estado: estadoInput.value.trim(),
        ubicacion: ubicacionInput.value.trim(),
        encargado: encargadoInput.value.trim()
      };

      inv.push(nuevo);
      guardar(inv);

      inventoryForm.reset();
      generarCodigo();
      renderTabla(buscador.value.trim());
      toast("success","Artículo guardado");

      if (nuevo.stock < ALERT_THRESHOLD) {
        enviarAlertaItem(nuevo);
      }
    });
  }

  /* -------------------------
     BUSCADOR
  -------------------------*/
  buscador.addEventListener("input", () => {
    renderTabla(buscador.value.trim());
  });

  /* -------------------------
     EXPORTAR CSV / PDF
  -------------------------*/
  function exportToCSV(filename) {
    const inv = leer();
    if (!inv.length) return Swal.fire("No hay datos");

    const header = ["Código","Nombre","Stock","Categoría","Estado","Ubicación","Encargado"];
    const rows = [header, ...inv.map(i=>[
      i.codigo,i.nombre,i.stock,i.categoria,i.estado,i.ubicacion,i.encargado
    ])];

    const csv = rows.map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  btnExportCSV?.addEventListener("click",()=>exportToCSV("inventario.csv"));
  btnExportCSVReport?.addEventListener("click",()=>exportToCSV("reporte.csv"));

  const generarPDF = () => {
    try{
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.text("SMARTINVENTORY - Reporte",20,20);

      const inv = leer();
      const body = inv.map(i=>[
        i.codigo,i.nombre,i.stock,i.categoria,i.estado,i.ubicacion,i.encargado
      ]);

      doc.autoTable({
        startY:40,
        head:[["Código","Nombre","Stock","Categoría","Estado","Ubicación","Encargado"]],
        body
      });
      doc.save("reporte.pdf");
    }catch(e){ Swal.fire("Error jsPDF"); }
  };
  btnPDF?.addEventListener("click",generarPDF);
  btnPDFReport?.addEventListener("click",generarPDF);

  /* -------------------------
     DASHBOARD
  -------------------------*/
  function actualizarResumenYGrafico() {
    const inv = leer();
    const oper = inv.filter(i=>i.estado==="Operativo").length;
    const inop = inv.filter(i=>i.estado==="Inoperativo").length;

    totalArticulosEl.textContent = inv.length;
    totalOperativosEl.textContent = oper;
    totalInoperativosEl.textContent = inop;

    if (!graficoCtx) return;

    const ctx = graficoCtx.getContext("2d");
    if (chart) chart.destroy();

    chart = new Chart(ctx,{
      type:"doughnut",
      data:{
        labels:["Operativos","Inoperativos"],
        datasets:[{data:[oper,inop]}]
      },
      options:{responsive:true}
    });
  }

  /* -------------------------
     REPORTES
  -------------------------*/
  function cargarReporte() {
    const inv = leer();
    tablaReporteBody.innerHTML = "";
    inv.forEach(i => {
      tablaReporteBody.innerHTML += `
        <tr>
          <td>${i.codigo}</td>
          <td>${i.nombre}</td>
          <td>${i.categoria}</td>
          <td>${i.estado}</td>
          <td>${i.ubicacion}</td>
          <td>${i.encargado}</td>
          <td>${i.stock}</td>
        </tr>`;
    });
  }

  /* -------------------------
     LOGOUT
  -------------------------*/
  logoutBtn.addEventListener("click",()=>{
    Swal.fire({title:"¿Cerrar sesión?",showCancelButton:true}).then(r=>{
      if(r.isConfirmed){
        localStorage.removeItem("sesionActiva");
        window.location="index.html";
      }
    });
  });

  /* -------------------------
     NAVEGACIÓN
  -------------------------*/
  navLinks.forEach(a => a.addEventListener("click", ev => {
    ev.preventDefault();
    navLinks.forEach(x => x.classList.remove("activo"));
    a.classList.add("activo");

    const sec = qs(a.getAttribute("href"));
    sections.forEach(s => s.style.display="none");

    sec.style.display="block";

    if (sec.id==="inventario"){ generarCodigo(); renderTabla(); }
    if (sec.id==="reportes"){ cargarReporte(); }
  }));

  /* -------------------------
     ALERTA AUTOMÁTICA CADA 5 MINUTOS
  -------------------------*/
  async function verificarStock() {
    const inv = leer();
    const bajos = inv.filter(i => i.stock < ALERT_THRESHOLD);

    if (!bajos.length) return;

    Swal.fire({
      icon:"warning",
      title:"Stock bajo",
      html: bajos.map(b => `${b.codigo} — ${b.nombre} (${b.stock})`).join("<br>")
    });

    bajos.forEach(item => enviarAlertaItem(item));
  }

  setInterval(verificarStock, 5 * 60 * 1000);

  /* -------------------------
     ESCANEO SIMULADO
  -------------------------*/
  btnScan.addEventListener("click", () => {
    Swal.fire({title:"Simular Escaneo",input:"text",showCancelButton:true}).then(r=>{
      if (!r.isConfirmed) return;

      const code = r.value.trim();
      const inv = leer();
      const found = inv.find(x => x.codigo === code);

      if (found) {
        codigoInput.value = found.codigo;
        nombreInput.value = found.nombre;
        stockInput.value = found.stock;
        categoriaInput.value = found.categoria;
        estadoInput.value = found.estado;
        ubicacionInput.value = found.ubicacion;
        encargadoInput.value = found.encargado;
        Swal.fire("Encontrado", found.nombre, "success");
      } else {
        Swal.fire({title:"No existe",text:`¿Crear ${code}?`,showCancelButton:true})
        .then(x=>{
          if (x.isConfirmed){
            codigoInput.value = code;
            nombreInput.value = "";
            stockInput.value = "0";
            categoriaInput.value = "";
            estadoInput.value = "";
            ubicacionInput.value = "";
            encargadoInput.value = "";
            Swal.fire("Complete datos y guarde");
          }
        });
      }
    });
  });

  /* -------------------------
     INICIO
  -------------------------*/
  generarCodigo();
  renderTabla();
  actualizarResumenYGrafico();
});
