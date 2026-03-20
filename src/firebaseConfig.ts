import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Suas chaves reais que você acabou de encontrar
const firebaseConfig = {
  apiKey: "AIzaSyDsQ3x7I5WYS7hV5jJ6Dz7ALlTcjLtKPNM",
  authDomain: "estoque-27709.firebaseapp.com",
  projectId: "estoque-27709",
  storageBucket: "estoque-27709.firebasestorage.app",
  messagingSenderId: "36714588539",
  appId: "1:36714588539:web:b666f68988fc21c39ef5de",
  measurementId: "G-FVSEKBX9KH"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// EXPORTA as ferramentas para o resto do site usar
export const db = getFirestore(app);
export const auth = getAuth(app);