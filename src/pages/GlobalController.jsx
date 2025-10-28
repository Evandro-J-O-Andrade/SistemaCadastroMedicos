import React, { useEffect, useState } from "react";

/* ===================== LocalStorageService ===================== */
export const LocalStorageService = {
  getItem(key, defaultValue = []) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch (e) {
      console.error("LocalStorageService.getItem error", e);
      return defaultValue;
    }
  },
  saveItem(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error("LocalStorageService.saveItem error", e);
      return false;
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error("LocalStorageService.removeItem error", e);
      return false;
    }
  },
};

/* ===================== GlobalController ===================== */
export const GlobalController = {
  MEDICOS_KEY: "medicos",
  PLANTOES_KEY: "plantoes",

  getMedicos() {
    return LocalStorageService.getItem(this.MEDICOS_KEY, []);
  },
  getPlantoes() {
    return LocalStorageService.getItem(this.PLANTOES_KEY, []);
  },

  buildMedicoMaps() {
    const medicos = this.getMedicos();
    const medicoByNome = new Map();
    const medicoByCrm = new Map();
    medicos.forEach(m => {
      if (m.nome) medicoByNome.set(m.nome.toLowerCase(), m);
      if (m.crm) medicoByCrm.set(m.crm.toString(), m);
    });
    return { medicoByNome, medicoByCrm };
  },

  findMedicoByName(name) {
    if (!name) return null;
    const { medicoByNome } = this.buildMedicoMaps();
    return medicoByNome.get(name.toLowerCase()) || null;
  },

  searchMedicos(query) {
    const { medicoByNome } = this.buildMedicoMaps();
    const arr = Array.from(medicoByNome.values());
    if (!query) return arr;
    return arr.filter(m => (m.nome || "").toLowerCase().includes(query.toLowerCase()));
  },

  listEspecialidades() {
    const medicos = this.getMedicos();
    const set = new Set();
    medicos.forEach(m => {
      const esp = m.especialidades || m.especialidade || [];
      if (Array.isArray(esp)) {
        esp.forEach(e => e && set.add(e.toString()));
      } else if (esp) set.add(esp.toString());
    });
    return Array.from(set).sort();
  },

  searchEspecialidades(query) {
    const espList = this.listEspecialidades();
    if (!query) return espList;
    return espList.filter(e => e.toLowerCase().includes(query.toLowerCase()));
  },

  getPlantaoRecords({ medicoName, especialidade, crm, date, time }) {
    const plantoes = this.getPlantoes();
    const { medicoByNome, medicoByCrm } = this.buildMedicoMaps();

    const targetDate = date ? new Date(date) : null;
    const targetTime = time ? (() => {
      const now = new Date();
      const [hh, mm] = (time || "").split(":");
      now.setHours(Number(hh || 0), Number(mm || 0), 0, 0);
      return now;
    })() : null;

    const sameDate = (dStr, tDate) => {
      if (!dStr || !tDate) return false;
      const d = new Date(dStr);
      return !isNaN(d) &&
        d.getFullYear() === tDate.getFullYear() &&
        d.getMonth() === tDate.getMonth() &&
        d.getDate() === tDate.getDate();
    };

    const sameTime = (tStr, tTime) => {
      if (!tStr || !tTime) return false;
      const [h, m] = tStr.split(":").map(n => n.padStart(2, "0"));
      const [hh, mm] = [tTime.getHours().toString().padStart(2, "0"), tTime.getMinutes().toString().padStart(2, "0")];
      return h === hh && m === mm;
    };

    let medicoObj = medicoName ? medicoByNome.get(medicoName.toLowerCase()) : null;
    if (!medicoObj && crm) medicoObj = medicoByCrm.get(crm.toString());

    let results = plantoes.filter(p => {
      const pMedNome = (p.medicoNome || p.medico || "").toString();
      const pMedCrm = (p.crm || p.medicoCrm || "").toString();
      const pEsp = (p.especialidade || p.specialty || "").toString();
      const pDate = p.data || p.date || p.dt || null;
      const pTime = p.hora || p.time || p.horaInicio || null;

      if (medicoName && pMedNome.toLowerCase() !== medicoName.toLowerCase()) return false;
      if (crm && pMedCrm !== crm.toString()) return false;
      if (especialidade && pEsp.toLowerCase() !== especialidade.toLowerCase()) return false;
      if (targetDate && !sameDate(pDate, targetDate)) return false;
      if (targetTime && !sameTime(pTime, targetTime)) return false;
      return true;
    });

    if (medicoObj && results.length === 0) {
      const medId = medicoObj.id || medicoObj._id || medicoObj.crm || medicoObj.nome;
      results = plantoes.filter(p => {
        if (p.medicoId === medId || p.medico === medId || (p.medicoNome || "").toLowerCase() === (medicoObj.nome || "").toLowerCase()) return true;
        return false;
      }).filter(p => {
        const pEsp = (p.especialidade || "").toString();
        if (especialidade && pEsp.toLowerCase() !== especialidade.toLowerCase()) return false;
        const pDate = p.data || p.date || null;
        if (targetDate && !sameDate(pDate, targetDate)) return false;
        const pTime = p.hora || p.time || null;
        if (targetTime && !sameTime(pTime, targetTime)) return false;
        return true;
      });
    }

    return results.map(p => {
      const pMedNome = p.medicoNome || p.medico || "";
      const medico = medicoByNome.get(pMedNome.toLowerCase()) || null;
      return { ...p, medico };
    });
  },

  calcStats(plantoes) {
    if (!plantoes || !plantoes.length) return { total: 0, mediaDia: 0, mediaMes: 0, mediaAno: 0 };

    const total = plantoes.length;
    const dias = new Set(), meses = new Set(), anos = new Set();

    plantoes.forEach(p => {
      const d = new Date(p.data || p.date || p.dt || null);
      if (!isNaN(d)) {
        dias.add(d.toISOString().slice(0, 10));
        meses.add(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`);
        anos.add(d.getFullYear());
      }
    });

    return {
      total,
      mediaDia: dias.size ? +(total / dias.size).toFixed(2) : 0,
      mediaMes: meses.size ? +(total / meses.size).toFixed(2) : 0,
      mediaAno: anos.size ? +(total / anos.size).toFixed(2) : 0
    };
  }
};

/* ===================== RelatoriosPage ===================== */
export default function RelatoriosPage() {
  const [medicoQuery, setMedicoQuery] = useState("");
  const [especialidadeQuery, setEspecialidadeQuery] = useState("");
  const [crmQuery, setCrmQuery] = useState("");
  const [dateQuery, setDateQuery] = useState("");
  const [timeQuery, setTimeQuery] = useState("");

  const [medicoSuggestions, setMedicoSuggestions] = useState([]);
  const [especialidadeSuggestions, setEspecialidadeSuggestions] = useState([]);

  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  const [errorsMap, setErrorsMap] = useState({}); // {rowIdx: {field: true}}

  useEffect(() => {
    setMedicoSuggestions(GlobalController.searchMedicos(medicoQuery).map(m => m.nome));
    setEspecialidadeSuggestions(GlobalController.searchEspecialidades(especialidadeQuery));
  }, [medicoQuery, especialidadeQuery]);

  const validateField = (field, value) => {
    if (!value) return false;
    if (field === "crm") return /^\d+$/.test(value);
    if (field === "data") return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(new Date(value));
    if (field === "hora") return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
    return false;
  };

  const handleCellChange = (idx, field, value) => {
    setRecords(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });

    setErrorsMap(prev => {
      const rowErrors = prev[idx] || {};
      if (validateField(field, value)) delete rowErrors[field];
      else rowErrors[field] = true;
      return { ...prev, [idx]: rowErrors };
    });
  };

  const handleSaveEdits = () => {
    // Não salvar se houver erros
    const hasErrors = Object.values(errorsMap).some(errs => Object.keys(errs).length > 0);
    if (hasErrors) {
      alert("Existem campos inválidos. Corrija antes de salvar.");
      return;
    }

    const plantoes = GlobalController.getPlantoes();
    const updated = [...plantoes];
    records.forEach((rec, idx) => {
      const id = rec.id || rec._id || null;
      let foundIndex = -1;
      if (id) foundIndex = updated.findIndex(p => (p.id === id || p._id === id));
      if (foundIndex === -1) {
        foundIndex = updated.findIndex(p => (p.medicoNome === rec.medicoNome && (p.data || p.date) === (rec.data || rec.date) && (p.hora || p.time) === (rec.hora || rec.time)));
      }
      if (foundIndex !== -1) updated[foundIndex] = { ...updated[foundIndex], ...rec };
    });

    if (LocalStorageService.saveItem(GlobalController.PLANTOES_KEY, updated)) {
      alert("Edições salvas no localStorage.");
      handleSearch();
    } else alert("Erro ao salvar edições.");
  };

  const handleSearch = () => {
    setError(null);
    const filters = {
      medicoName: medicoQuery.trim() || null,
      especialidade: especialidadeQuery.trim() || null,
      crm: crmQuery.trim() || null,
      date: dateQuery || null,
      time: timeQuery || null
    };

    if (filters.medicoName) {
      const medicoObj = GlobalController.findMedicoByName(filters.medicoName);
      if (!medicoObj) {
        setError(`Médico "${filters.medicoName}" sem cadastro.`);
        setRecords([]);
        setStats(null);
        return;
      }
      if (filters.especialidade) {
        const espList = medicoObj.especialidades || medicoObj.especialidade || [];
        const has = Array.isArray(espList) ? espList.map(e => e.toLowerCase()).includes(filters.especialidade.toLowerCase()) : (espList && espList.toLowerCase() === filters.especialidade.toLowerCase());
        if (!has) {
          setError(`Médico "${filters.medicoName}" não tem registro para a especialidade "${filters.especialidade}".`);
          setRecords([]);
          setStats(null);
          return;
        }
      }
      if (filters.crm && medicoObj.crm && medicoObj.crm.toString() !== filters.crm.toString()) {
        setError(`CRM informado não corresponde ao médico "${filters.medicoName}".`);
        setRecords([]);
        setStats(null);
        return;
      }
    }

    const found = GlobalController.getPlantaoRecords(filters);
    if (!found || !found.length) {
      setError("Nenhum registro encontrado para os filtros informados.");
      setRecords([]);
      setStats(null);
      return;
    }

    setRecords(found);
    setStats(GlobalController.calcStats(found));
    setErrorsMap({});
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Relatórios — busca cruzada</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-sm">Médico</label>
          <input placeholder="Nome do médico" value={medicoQuery} onChange={e => setMedicoQuery(e.target.value)} list="medicos-list" className="w-full border p-2 rounded"/>
          <datalist id="medicos-list">{medicoSuggestions.map((m,i)=><option key={i} value={m}/>)}</datalist>
        </div>
        <div>
          <label className="block text-sm">Especialidade</label>
          <input placeholder="Especialidade" value={especialidadeQuery} onChange={e => setEspecialidadeQuery(e.target.value)} list="especialidades-list" className="w-full border p-2 rounded"/>
          <datalist id="especialidades-list">{especialidadeSuggestions.map((e,i)=><option key={i} value={e}/>)}</datalist>
        </div>
        <div>
          <label className="block text-sm">CRM</label>
          <input placeholder="CRM do médico" value={crmQuery} onChange={e => setCrmQuery(e.target.value)} className="w-full border p-2 rounded"/>
        </div>
        <div>
          <label className="block text-sm">Data (YYYY-MM-DD)</label>
          <input placeholder="2025-10-28" value={dateQuery} onChange={e => setDateQuery(e.target.value)} className="w-full border p-2 rounded"/>
        </div>
        <div>
          <label className="block text-sm">Hora (HH:mm)</label>
          <input placeholder="14:30" value={timeQuery} onChange={e => setTimeQuery(e.target.value)} className="w-full border p-2 rounded"/>
        </div>
        <div className="flex items-end">
          <button onClick={handleSearch} className="px-4 py-2 bg-blue-600 text-white rounded">Pesquisar</button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}

      {stats && (
        <div className="mb-4 p-3 bg-gray-50 rounded border">
          <strong>Estatísticas:</strong>
          <div>Total atendimentos: {stats.total}</div>
          <div>Média por dia: {stats.mediaDia}</div>
          <div>Média por mês: {stats.mediaMes}</div>
          <div>Média por ano: {stats.mediaAno}</div>
        </div>
      )}

      <div className="overflow-auto border rounded">
        <table className="min-w-full text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">#</th>
              <th className="p-2">Médico</th>
              <th className="p-2">CRM</th>
              <th className="p-2">Especialidade</th>
              <th className="p-2">Data</th>
              <th className="p-2">Hora</th>
              <th className="p-2">Observações</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, idx) => {
              const rowErrs = errorsMap[idx] || {};
              return (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="p-2 align-top">{idx+1}</td>
                  <td className="p-2 align-top"><input className="w-full border rounded p-1" value={r.medicoNome || (r.medico && r.medico.nome) || ""} onChange={e=>handleCellChange(idx,"medicoNome",e.target.value)}/></td>
                  <td className={`p-2 align-top ${rowErrs.crm ? "border-red-500 border-2" : ""}`}><input className="w-full border rounded p-1" value={r.crm || (r.medico && r.medico.crm) || ""} onChange={e=>handleCellChange(idx,"crm",e.target.value)}/></td>
                  <td className="p-2 align-top"><input className="w-full border rounded p-1" value={r.especialidade || ""} onChange={e=>handleCellChange(idx,"especialidade",e.target.value)}/></td>
                  <td className={`p-2 align-top ${rowErrs.data ? "border-red-500 border-2" : ""}`}><input className="w-full border rounded p-1" value={r.data || r.date || ""} onChange={e=>handleCellChange(idx,"data",e.target.value)}/></td>
                  <td className={`p-2 align-top ${rowErrs.hora ? "border-red-500 border-2" : ""}`}><input className="w-full border rounded p-1" value={r.hora || r.time || ""} onChange={e=>handleCellChange(idx,"hora",e.target.value)}/></td>
                  <td className="p-2 align-top"><input className="w-full border rounded p-1" value={r.obs || r.observacoes || ""} onChange={e=>handleCellChange(idx,"obs",e.target.value)}/></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {records.length>0 && (
        <div className="mt-3 flex gap-2">
          <button onClick={handleSaveEdits} className="px-4 py-2 bg-green-600 text-white rounded">Salvar edições</button>
          <button onClick={handleSearch} className="px-4 py-2 bg-gray-200 rounded">Recarregar</button>
        </div>
      )}
    </div>
  );
}
   