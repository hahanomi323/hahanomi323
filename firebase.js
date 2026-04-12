/* ================================================================
   FIREBASE.JS — AutoShop · Cơ sở dữ liệu trung tâm
   Project: autoshop-vn
   ================================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ── CONFIG ────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyByewftP_DZuQBNDCM8ib0opJo8SaMItcc",
  authDomain:        "autoshop-vn.firebaseapp.com",
  projectId:         "autoshop-vn",
  storageBucket:     "autoshop-vn.firebasestorage.app",
  messagingSenderId: "953081382478",
  appId:             "1:953081382478:web:ca91ba8cc52a86651e251f",
  measurementId:     "G-R2ZLN85PKB"
};

const app     = initializeApp(firebaseConfig);
const auth    = getAuth(app);
const db      = getFirestore(app);
const storage = getStorage(app);

/* ================================================================
   AUTH
   ================================================================ */

async function AS_register(email, password, profile) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: profile.name });
    await setDoc(doc(db, "users", cred.user.uid), {
      uid:       cred.user.uid,
      name:      profile.name,
      email,
      phone:     profile.phone || "",
      city:      profile.city  || "",
      role:      "user",
      listings:  [],
      createdAt: serverTimestamp()
    });
    const session = { uid: cred.user.uid, name: profile.name, email, role: "user", phone: profile.phone || "", city: profile.city || "" };
    sessionStorage.setItem("autoshop_session", JSON.stringify(session));
    return { success: true, user: session };
  } catch (err) {
    return { success: false, error: _authError(err.code) };
  }
}

async function AS_login(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const snap  = await getDoc(doc(db, "users", cred.user.uid));
    const data  = snap.exists() ? snap.data() : {};
    const session = {
      uid:   cred.user.uid,
      name:  data.name  || cred.user.displayName || "User",
      email: cred.user.email,
      role:  data.role  || "user",
      phone: data.phone || "",
      city:  data.city  || ""
    };
    sessionStorage.setItem("autoshop_session", JSON.stringify(session));
    return { success: true, user: session };
  } catch (err) {
    return { success: false, error: _authError(err.code) };
  }
}

async function AS_logout() {
  await signOut(auth);
  sessionStorage.removeItem("autoshop_session");
  location.href = "index.html";
}

function AS_getSession() {
  return JSON.parse(sessionStorage.getItem("autoshop_session") || "null");
}

function AS_onAuthChange(callback) {
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const snap = await getDoc(doc(db, "users", firebaseUser.uid));
      const data = snap.exists() ? snap.data() : {};
      const session = {
        uid:   firebaseUser.uid,
        name:  data.name  || firebaseUser.displayName || "User",
        email: firebaseUser.email,
        role:  data.role  || "user",
        phone: data.phone || "",
        city:  data.city  || ""
      };
      sessionStorage.setItem("autoshop_session", JSON.stringify(session));
      callback(session);
    } else {
      sessionStorage.removeItem("autoshop_session");
      callback(null);
    }
  });
}

/* ================================================================
   LISTINGS
   ================================================================ */

async function AS_addListing(listingData, photoDataUrls = []) {
  try {
    const session = AS_getSession();
    if (!session) return { success: false, error: "Chưa đăng nhập" };

    // Upload ảnh lên Storage
    const photoURLs = [];
    for (let i = 0; i < photoDataUrls.length; i++) {
      const url = await _uploadPhoto(photoDataUrls[i], `listings/${session.uid}_${Date.now()}_${i}`);
      if (url) photoURLs.push(url);
    }

    const listing = {
      ...listingData,
      photos:      photoURLs,
      userId:      session.uid,
      sellerName:  listingData.sellerName || session.name,
      vehicleType: listingData.vehicleType || "oto",
      status:      "pending",
      createdAt:   serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "listings"), listing);

    // Cập nhật mảng listings trong user
    const userRef  = doc(db, "users", session.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const old = userSnap.data().listings || [];
      await updateDoc(userRef, { listings: [...old, docRef.id] });
    }

    return { success: true, id: docRef.id };
  } catch (err) {
    console.error("AS_addListing:", err);
    return { success: false, error: err.message };
  }
}

async function AS_getActiveListings() {
  try {
    const q = query(
      collection(db, "listings"),
      where("status", "==", "active"),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("AS_getActiveListings:", err);
    return [];
  }
}

async function AS_getListing(id) {
  try {
    const snap = await getDoc(doc(db, "listings", id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    return null;
  }
}

async function AS_getMyListings() {
  try {
    const session = AS_getSession();
    if (!session) return [];
    const q = query(
      collection(db, "listings"),
      where("userId", "==", session.uid),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    return [];
  }
}

async function AS_updateListingStatus(id, status) {
  try {
    await updateDoc(doc(db, "listings", id), { status, updatedAt: serverTimestamp() });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function AS_deleteListing(id) {
  try {
    await deleteDoc(doc(db, "listings", id));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/* ================================================================
   ADMIN
   ================================================================ */

async function AS_admin_getAllListings() {
  try {
    const q = query(collection(db, "listings"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    return [];
  }
}

async function AS_admin_getAllUsers() {
  try {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    return [];
  }
}

/* ================================================================
   HELPERS
   ================================================================ */

async function _uploadPhoto(dataUrl, path) {
  try {
    const storageRef = ref(storage, path);
    await uploadString(storageRef, dataUrl, "data_url");
    return await getDownloadURL(storageRef);
  } catch (err) {
    console.error("Upload photo:", err);
    return null;
  }
}

function _authError(code) {
  const map = {
    "auth/email-already-in-use":  "❌ Email này đã được đăng ký!",
    "auth/invalid-email":          "❌ Email không hợp lệ!",
    "auth/weak-password":          "❌ Mật khẩu phải có ít nhất 6 ký tự!",
    "auth/user-not-found":         "❌ Tài khoản không tồn tại!",
    "auth/wrong-password":         "❌ Mật khẩu không đúng!",
    "auth/invalid-credential":     "❌ Email hoặc mật khẩu không đúng!",
    "auth/too-many-requests":      "❌ Quá nhiều lần thử. Vui lòng thử lại sau!",
    "auth/network-request-failed": "❌ Lỗi kết nối mạng!"
  };
  return map[code] || "❌ Đã có lỗi xảy ra. Vui lòng thử lại!";
}

/* ================================================================
   EXPORT toàn cục — dùng được ở mọi file
   ================================================================ */
window.AS = {
  register:     AS_register,
  login:        AS_login,
  logout:       AS_logout,
  getSession:   AS_getSession,
  onAuthChange: AS_onAuthChange,

  addListing:          AS_addListing,
  getActiveListings:   AS_getActiveListings,
  getListing:          AS_getListing,
  getMyListings:       AS_getMyListings,
  updateListingStatus: AS_updateListingStatus,
  deleteListing:       AS_deleteListing,

  admin: {
    getAllListings: AS_admin_getAllListings,
    getAllUsers:    AS_admin_getAllUsers
  }
};

console.log("✅ AutoShop Firebase đã kết nối — project: autoshop-vn");
