document.addEventListener("DOMContentLoaded", () => {
  const tablaBody = document.querySelector("#tablaReporte tbody");
  const btnPDF = document.getElementById("btnPDF");

  // Cargar datos del inventario
  const inventario = JSON.parse(localStorage.getItem("inventario")) || [];

  if (inventario.length === 0) {
    tablaBody.innerHTML = `
      <tr><td colspan="6" class="text-center text-muted">No hay registros de inventario</td></tr>
    `;
  } else {
    inventario.forEach(item => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${item.codigo}</td>
        <td>${item.nombre}</td>
        <td>${item.categoria}</td>
        <td>${item.cantidad}</td>
        <td>${item.ubicacion}</td>
        <td>${item.fecha || new Date().toLocaleDateString()}</td>
      `;
      tablaBody.appendChild(fila);
    });
  }

  // Generar PDF
  btnPDF.addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Reporte General de Inventario", 14, 20);
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 150, 27);

    const columnas = ["Código", "Nombre", "Categoría", "Cantidad", "Ubicación", "Fecha"];
    const filas = inventario.map(item => [
      item.codigo,
      item.nombre,
      item.categoria,
      item.cantidad,
      item.ubicacion,
      item.fecha || new Date().toLocaleDateString()
    ]);

    doc.autoTable({
      startY: 35,
      head: [columnas],
      body: filas,
      theme: "grid",
      headStyles: { fillColor: [33, 74, 128] },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      styles: { fontSize: 10 },
    });

    doc.save("Reporte_Inventario.pdf");
  });
});
