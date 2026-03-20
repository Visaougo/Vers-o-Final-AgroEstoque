import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, History, Users, Plus, AlertTriangle, 
  X, Trash2, Phone, Search, DollarSign, LogOut, Sprout, Tractor, ShoppingCart, ArrowUpCircle
} from 'lucide-react';
import { db, auth } from './firebaseConfig';
import { 
  collection, onSnapshot, query, orderBy, addDoc, doc, 
  deleteDoc, updateDoc, getDoc, setDoc, increment 
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [abaAtiva, setAbaAtiva] = useState('dashboard');
  const [estoque, setEstoque] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [filtro, setFiltro] = useState(''); 
  const [modalAberto, setModalAberto] = useState(false);
  const [vendaModal, setVendaModal] = useState<any>(null); // Armazena o cliente selecionado para venda

  // --- CONTROLE DE ACESSO ---
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userSnap = await getDoc(doc(db, "usuarios", currentUser.uid));
        if (userSnap.exists()) setUserData(userSnap.data());
      } else { setUser(null); }
    });
    return () => unsubAuth();
  }, []);

  // --- BUSCA DE DADOS ---
  useEffect(() => {
    if (userData?.autorizado) {
      onSnapshot(query(collection(db, "produtos"), orderBy("dataCriacao", "desc")), (s) => 
        setEstoque(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      onSnapshot(query(collection(db, "clientes"), orderBy("dataCriacao", "desc")), (s) => 
        setClientes(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    }
  }, [userData]);

  // --- FUNÇÃO DE VENDA / DÉBITO ---
  const registrarVenda = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const produtoId = fd.get('produtoId') as string;
    const qtd = Number(fd.get('quantidade'));
    const produto = estoque.find(p => p.id === produtoId);

    if (!produto || produto.quantidade < qtd) return alert("Estoque insuficiente!");

    const valorTotal = qtd * (produto.precoVenda || 0);

    // 1. Atualiza o Débito do Cliente
    await updateDoc(doc(db, "clientes", vendaModal.id), {
      totalDevendo: increment(valorTotal),
      ultimoPedido: produto.nome,
      qtdPedido: qtd
    });

    // 2. Baixa no Estoque
    await updateDoc(doc(db, "produtos", produtoId), {
      quantidade: increment(-qtd)
    });

    // 3. Registra no Histórico (Movimentações)
    await addDoc(collection(db, "movimentacoes"), {
      tipo: 'venda',
      cliente: vendaModal.nome,
      produto: produto.nome,
      quantidade: qtd,
      valor: valorTotal,
      data: new Date()
    });

    setVendaModal(null);
    alert("Venda registrada e débito adicionado ao cliente!");
  };

  if (!user || !userData?.autorizado) return <div className="h-screen flex items-center justify-center font-bold text-emerald-800">Carregando Agro-Estoque...</div>;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#FDFDFD]">
      {/* SIDEBAR */}
      <aside className="w-64 bg-emerald-900 text-white p-6 flex flex-col hidden md:flex">
        <div className="flex items-center gap-2 text-2xl font-black mb-10 italic text-emerald-400"><Sprout /> AGRO</div>
        <nav className="space-y-2">
          <MenuBtn active={abaAtiva === 'dashboard'} onClick={() => setAbaAtiva('dashboard')} icon={<LayoutDashboard size={18}/>} label="Início" />
          <MenuBtn active={abaAtiva === 'produtos'} onClick={() => setAbaAtiva('produtos')} icon={<Package size={18}/>} label="Estoque" />
          <MenuBtn active={abaAtiva === 'clientes'} onClick={() => setAbaAtiva('clientes')} icon={<Users size={18}/>} label="Clientes / Débitos" />
        </nav>
      </aside>

      {/* CONTEÚDO */}
      <main className="flex-1 p-6 md:p-10">
        <header className="flex justify-between items-center mb-8">
           <h1 className="text-2xl font-black text-slate-800 uppercase">{abaAtiva}</h1>
           <input type="text" placeholder="Pesquisar..." className="p-2 border rounded-xl outline-none" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        </header>

        {/* LISTA DE CLIENTES COM FOCO EM DÍVIDA */}
        {abaAtiva === 'clientes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={() => setModalAberto(true)} className="bg-emerald-50 border-2 border-dashed border-emerald-200 p-6 rounded-2xl text-emerald-600 font-bold hover:bg-emerald-100">+ Novo Cliente</button>
            {clientes.filter(c => c.nome.toLowerCase().includes(filtro.toLowerCase())).map(c => (
              <div key={c.id} className="bg-white p-6 rounded-3xl border shadow-sm relative group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-black text-slate-800 text-lg">{c.nome}</h3>
                    <p className="text-xs text-slate-400">{c.telefone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-300 uppercase">Dívida Total</p>
                    <p className={`text-xl font-black ${c.totalDevendo > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      R$ {c.totalDevendo?.toFixed(2) || "0,00"}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl mb-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Último Pedido</p>
                  <p className="text-sm font-bold text-slate-600">{c.ultimoPedido || "Nenhum pedido"} {c.qtdPedido && `(${c.qtdPedido} un)`}</p>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setVendaModal(c)} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-700">
                    <ShoppingCart size={14}/> Novo Pedido
                  </button>
                  <button onClick={async () => {
                    if(confirm("Zerar dívida?")) await updateDoc(doc(db, "clientes", c.id), { totalDevendo: 0 });
                  }} className="px-4 bg-slate-100 text-slate-400 py-3 rounded-xl font-bold text-xs hover:bg-emerald-100 hover:text-emerald-600">
                    Quitar
                  </button>
                </div>
                <button onClick={() => deleteDoc(doc(db, "clientes", c.id))} className="absolute -top-2 -right-2 bg-white border shadow-sm p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-red-500"><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
        )}

        {/* ABA ESTOQUE (MANTIDA) */}
        {abaAtiva === 'produtos' && (
           <div className="space-y-4">
              <button onClick={() => setModalAberto(true)} className="w-full bg-emerald-600 text-white font-bold p-4 rounded-xl shadow-lg">+ Adicionar ao Estoque</button>
              {estoque.map(p => (
                <div key={p.id} className="bg-white p-5 rounded-2xl border flex justify-between items-center group">
                  <div><p className="font-bold">{p.nome}</p><p className="text-[10px] text-slate-300 font-black">{p.categoria}</p></div>
                  <div className="flex items-center gap-4">
                    <span className="font-black text-emerald-600">{p.quantidade} un</span>
                    <button onClick={() => deleteDoc(doc(db, "produtos", p.id))} className="text-slate-100 group-hover:text-red-500"><Trash2 size={18}/></button>
                  </div>
                </div>
              ))}
           </div>
        )}
      </main>

      {/* MODAL NOVO PEDIDO (Onde a mágica acontece) */}
      {vendaModal && (
        <div className="fixed inset-0 bg-emerald-950/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative">
            <h3 className="text-xl font-black mb-2 text-emerald-900">Novo Pedido</h3>
            <p className="text-sm text-slate-400 mb-6 font-bold">Cliente: {vendaModal.nome}</p>
            
            <form onSubmit={registrarVenda} className="space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase">Escolha o Insumo</label>
              <select name="produtoId" required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-bold text-slate-700">
                {estoque.map(p => (
                  <option key={p.id} value={p.id}>{p.nome} (Disp: {p.quantidade})</option>
                ))}
              </select>
              
              <label className="text-xs font-black text-slate-400 uppercase">Quantidade</label>
              <input name="quantidade" type="number" required placeholder="0" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-bold" />
              
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setVendaModal(null)} className="flex-1 py-4 font-bold text-slate-400">Cancelar</button>
                <button type="submit" className="flex-[2] bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg">Confirmar Venda</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CADASTRO CLIENTE */}
      {modalAberto && abaAtiva === 'clientes' && (
        <div className="fixed inset-0 bg-emerald-950/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2rem] p-8">
            <h3 className="text-xl font-bold mb-6">Novo Cliente</h3>
            <form onSubmit={async (e:any) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              await addDoc(collection(db, "clientes"), {
                nome: fd.get('nome'), telefone: fd.get('telefone'), totalDevendo: 0, dataCriacao: new Date()
              });
              setModalAberto(false);
            }} className="space-y-4">
               <input name="nome" placeholder="Nome Completo" required className="w-full p-4 bg-slate-50 border rounded-xl" />
               <input name="telefone" placeholder="WhatsApp" required className="w-full p-4 bg-slate-50 border rounded-xl" />
               <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl">Cadastrar Cliente</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuBtn({ icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold text-sm transition-all ${active ? 'bg-emerald-700 text-white' : 'text-emerald-300 hover:bg-emerald-800'}`}>{icon} {label}</button>
  );
}