import { useParams } from "react-router-dom";

export function IssueDetail() {
  const { id } = useParams();

  return (
    <div>
      <h1>Issue Detail</h1>
      <p>Issue ID: {id}</p>
    </div>
  );
}
