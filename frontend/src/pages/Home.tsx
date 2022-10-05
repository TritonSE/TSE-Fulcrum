import { useContext } from "react";

import { GlobalContext } from "../context/GlobalContext";
import ReviewsView from "../views/ReviewsView";

export default function Home() {
  const { user } = useContext(GlobalContext);
  return <ReviewsView filter={{ reviewerEmail: user?.email || "" }} />;
}
