import {
  CampusWithAll,
  DepartmentWithAll,
} from "@/app/constants/CampusDivisions";
import { db } from "@/firebase/config";
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";

export interface DepartmentPost {
  id: string;
  content: string;
  campus: CampusWithAll;
  division: DepartmentWithAll;
  imageUrls: string[];
  createdAt: any; // Firestore Timestamp
  author: {
    id: string;
    name: string;
    campus: string;
    division: string;
  };
  likes?: string[]; // Array of user emails who liked the post
  comments?: {
    id: string;
    text: string;
    author: {
      id: string;
      name: string;
    };
    createdAt: any;
  }[];
}

interface UseGetDepartmentPostProps {
  selectedCampus?: CampusWithAll | null;
  selectedDivision?: DepartmentWithAll | null;
  limitCount?: number;
  enableRealtime?: boolean;
}

// TODO: useQuery 적용하기
export default function useGetDepartmentPost({
  selectedCampus = null,
  selectedDivision = null,
  limitCount = 20,
  enableRealtime = false,
}: UseGetDepartmentPostProps = {}) {
  const [posts, setPosts] = useState<DepartmentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query
        let q = query(
          collection(db, "department_posts"),
          orderBy("createdAt", "desc"),
          limit(limitCount)
        );

        // Add filters if provided
        if (selectedCampus && selectedCampus !== "ALL") {
          q = query(q, where("campus", "==", selectedCampus));
        }

        if (selectedDivision && selectedDivision !== "ALL") {
          q = query(q, where("division", "==", selectedDivision));
        }

        if (enableRealtime) {
          // Real-time listener
          const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
              const fetchedPosts: DepartmentPost[] = [];
              snapshot.forEach((doc) => {
                fetchedPosts.push({
                  id: doc.id,
                  ...doc.data(),
                } as DepartmentPost);
              });
              setPosts(fetchedPosts);
              setHasMore(fetchedPosts.length === limitCount);
              setLoading(false);
            },
            (err) => {
              console.error("🔥 실시간 데이터 가져오기 실패:", err);
              setError("데이터를 가져오는 중 오류가 발생했습니다.");
              setLoading(false);
            }
          );

          return unsubscribe;
        } else {
          // One-time fetch
          const snapshot = await getDocs(q);
          const fetchedPosts: DepartmentPost[] = [];
          snapshot.forEach((doc) => {
            fetchedPosts.push({ id: doc.id, ...doc.data() } as DepartmentPost);
          });
          setPosts(fetchedPosts);
          setHasMore(fetchedPosts.length === limitCount);
          setLoading(false);
        }
      } catch (err) {
        console.error("🔥 부서 게시물 가져오기 실패:", err);
        setError("데이터를 가져오는 중 오류가 발생했습니다.");
        setLoading(false);
      }
    };

    fetchPosts();
  }, [selectedCampus, selectedDivision, limitCount, enableRealtime]);

  const loadMore = async () => {
    if (loading || !hasMore) return;

    try {
      setLoading(true);

      let q = query(
        collection(db, "department_posts"),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );

      if (selectedCampus && selectedCampus !== "ALL") {
        q = query(q, where("campus", "==", selectedCampus));
      }

      if (selectedDivision && selectedDivision !== "ALL") {
        q = query(q, where("division", "==", selectedDivision));
      }

      const snapshot = await getDocs(q);
      const newPosts: DepartmentPost[] = [];
      snapshot.forEach((doc) => {
        newPosts.push({ id: doc.id, ...doc.data() } as DepartmentPost);
      });

      setPosts((prev) => [...prev, ...newPosts]);
      setHasMore(newPosts.length === limitCount);
    } catch (err) {
      console.error("🔥 추가 데이터 로드 실패:", err);
      setError("추가 데이터를 로드하는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setPosts([]);
    setHasMore(true);
    setError(null);
    setLoading(true);

    // Re-fetch data with current filters
    try {
      let q = query(
        collection(db, "department_posts"),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );

      if (selectedCampus && selectedCampus !== "ALL") {
        q = query(q, where("campus", "==", selectedCampus));
      }

      if (selectedDivision && selectedDivision !== "ALL") {
        q = query(q, where("division", "==", selectedDivision));
      }

      const snapshot = await getDocs(q);
      const fetchedPosts: DepartmentPost[] = [];
      snapshot.forEach((doc) => {
        fetchedPosts.push({ id: doc.id, ...doc.data() } as DepartmentPost);
      });

      setPosts(fetchedPosts);
      setHasMore(fetchedPosts.length === limitCount);
    } catch (err) {
      console.error("🔥 새로고침 실패:", err);
      setError("새로고침 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return {
    posts,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}
