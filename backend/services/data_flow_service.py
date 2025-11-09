"""
Data Flow Architecture Service
Manages data flow nodes, edges, and audit logging for the architectural map
"""
import sqlite3
import json
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "database" / "compliance.db"

NODE_JSON_FIELDS = [
    "data_domains",
    "classification_tags",
    "framework_controls",
    "evidence_links",
]

NODE_SINGLE_JSON_FIELDS = {
    "metadata_json": "metadata",
    "layout_position": "layout_position",
}

EDGE_JSON_FIELDS = [
    "controls_impacted",
]

EDGE_SINGLE_JSON_FIELDS = {
    "metadata_json": "metadata",
}


def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def _json_dumps(value: Optional[Any]) -> Optional[str]:
    if value is None:
        return None
    try:
        return json.dumps(value)
    except TypeError:
        return None


def _json_loads(value: Optional[str]) -> Any:
    if not value:
        return [] if value == "[]" else None
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return value


def _serialize_node_row(row: sqlite3.Row) -> Dict[str, Any]:
    node = dict(row)
    for field in NODE_JSON_FIELDS:
        node[field] = _json_loads(node.get(field))
        if node[field] is None:
            node[field] = []
    for db_field, prop_name in NODE_SINGLE_JSON_FIELDS.items():
        node[prop_name] = _json_loads(node.get(db_field))
    node["system_of_record"] = bool(node.get("system_of_record"))
    return node


def _serialize_edge_row(row: sqlite3.Row) -> Dict[str, Any]:
    edge = dict(row)
    for field in EDGE_JSON_FIELDS:
        edge[field] = _json_loads(edge.get(field))
        if edge[field] is None:
            edge[field] = []
    for db_field, prop_name in EDGE_SINGLE_JSON_FIELDS.items():
        edge[prop_name] = _json_loads(edge.get(db_field))
    edge["automated"] = bool(edge.get("automated", True))
    return edge


def _record_audit(
    conn: sqlite3.Connection,
    user_id: int,
    action: str,
    target_type: str,
    target_id: Optional[int],
    before_state: Optional[Dict[str, Any]],
    after_state: Optional[Dict[str, Any]],
    performed_by: int,
    reason: Optional[str] = None,
    approval_reference: Optional[str] = None,
) -> None:
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO data_flow_audit_log
        (user_id, action, target_type, target_id, before_state, after_state,
         performed_by, reason, approval_reference)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user_id,
            action,
            target_type,
            target_id,
            _json_dumps(before_state),
            _json_dumps(after_state),
            performed_by,
            reason,
            approval_reference,
        ),
    )


def record_data_flow_audit(**kwargs) -> None:
    conn = get_db()
    try:
        _record_audit(conn, **kwargs)
        conn.commit()
    finally:
        conn.close()


def list_data_flow_graph(user_id: int) -> Dict[str, List[Dict[str, Any]]]:
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM data_flow_nodes WHERE user_id = ? ORDER BY name ASC",
            (user_id,),
        )
        nodes = [_serialize_node_row(row) for row in cursor.fetchall()]

        cursor.execute(
            "SELECT * FROM data_flow_edges WHERE user_id = ? ORDER BY id ASC",
            (user_id,),
        )
        edges = [_serialize_edge_row(row) for row in cursor.fetchall()]

        return {"nodes": nodes, "edges": edges}
    finally:
        conn.close()


def list_data_flow_audit(user_id: int, limit: int = 100) -> List[Dict[str, Any]]:
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT * FROM data_flow_audit_log
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (user_id, limit),
        )
        records = []
        for row in cursor.fetchall():
            record = dict(row)
            record["before_state"] = _json_loads(record.get("before_state"))
            record["after_state"] = _json_loads(record.get("after_state"))
            records.append(record)
        return records
    finally:
        conn.close()


def get_data_flow_node(user_id: int, node_id: int, conn: Optional[sqlite3.Connection] = None) -> Dict[str, Any]:
    owns_connection = conn is None
    if owns_connection:
        conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM data_flow_nodes WHERE id = ? AND user_id = ?",
            (node_id, user_id),
        )
        row = cursor.fetchone()
        if not row:
            raise ValueError("Node not found")
        return _serialize_node_row(row)
    finally:
        if owns_connection and conn:
            conn.close()


def get_data_flow_edge(user_id: int, edge_id: int, conn: Optional[sqlite3.Connection] = None) -> Dict[str, Any]:
    owns_connection = conn is None
    if owns_connection:
        conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM data_flow_edges WHERE id = ? AND user_id = ?",
            (edge_id, user_id),
        )
        row = cursor.fetchone()
        if not row:
            raise ValueError("Edge not found")
        return _serialize_edge_row(row)
    finally:
        if owns_connection and conn:
            conn.close()


def _prepare_node_insert_data(data: Dict[str, Any]) -> Tuple[List[str], List[Any]]:
    columns: List[str] = [
        "user_id",
        "node_type",
        "name",
        "description",
        "icon",
        "sensitivity",
        "data_domains",
        "classification_tags",
        "owner",
        "responsible_party",
        "framework_controls",
        "evidence_links",
        "integration_status",
        "last_sync_at",
        "sync_frequency",
        "system_of_record",
        "metadata_json",
        "layout_position",
        "created_at",
        "updated_at",
    ]

    now = datetime.utcnow().isoformat()

    values = [
        data["user_id"],
        data["node_type"],
        data["name"],
        data.get("description"),
        data.get("icon"),
        data.get("sensitivity"),
        _json_dumps(data.get("data_domains")),
        _json_dumps(data.get("classification_tags")),
        data.get("owner"),
        data.get("responsible_party"),
        _json_dumps(data.get("framework_controls")),
        _json_dumps(data.get("evidence_links")),
        data.get("integration_status", "active"),
        data.get("last_sync_at"),
        data.get("sync_frequency"),
        int(bool(data.get("system_of_record"))),
        _json_dumps(data.get("metadata")),
        _json_dumps(data.get("layout_position")),
        now,
        now,
    ]

    return columns, values


def create_data_flow_node(user_id: int, payload: Dict[str, Any], performed_by: int) -> Dict[str, Any]:
    if "node_type" not in payload or "name" not in payload:
        raise ValueError("node_type and name are required")

    conn = get_db()
    try:
        payload = {**payload, "user_id": user_id}
        columns, values = _prepare_node_insert_data(payload)

        cursor = conn.cursor()
        cursor.execute(
            f"""
            INSERT INTO data_flow_nodes ({', '.join(columns)})
            VALUES ({', '.join(['?'] * len(values))})
            """,
            values,
        )
        node_id = cursor.lastrowid
        node = get_data_flow_node(user_id, node_id, conn=conn)

        _record_audit(
            conn,
            user_id=user_id,
            action="create_node",
            target_type="node",
            target_id=node_id,
            before_state=None,
            after_state=node,
            performed_by=performed_by,
        )
        conn.commit()
        return node
    finally:
        conn.close()


def update_data_flow_node(user_id: int, node_id: int, payload: Dict[str, Any], performed_by: int) -> Dict[str, Any]:
    if not payload:
        raise ValueError("No updates provided")

    conn = get_db()
    try:
        existing = get_data_flow_node(user_id, node_id, conn=conn)
        cursor = conn.cursor()

        set_clauses = []
        params: List[Any] = []

        mapping = {
            "description": "description",
            "icon": "icon",
            "sensitivity": "sensitivity",
            "owner": "owner",
            "responsible_party": "responsible_party",
            "integration_status": "integration_status",
            "last_sync_at": "last_sync_at",
            "sync_frequency": "sync_frequency",
        }

        for field, column in mapping.items():
            if field in payload:
                set_clauses.append(f"{column} = ?")
                params.append(payload[field])

        json_fields_mapping = {
            "data_domains": "data_domains",
            "classification_tags": "classification_tags",
            "framework_controls": "framework_controls",
            "evidence_links": "evidence_links",
            "metadata": "metadata_json",
            "layout_position": "layout_position",
        }

        for field, column in json_fields_mapping.items():
            if field in payload:
                set_clauses.append(f"{column} = ?")
                params.append(_json_dumps(payload[field]))

        if "system_of_record" in payload:
            set_clauses.append("system_of_record = ?")
            params.append(int(bool(payload["system_of_record"])))

        if "name" in payload:
            set_clauses.append("name = ?")
            params.append(payload["name"])

        if "node_type" in payload:
            set_clauses.append("node_type = ?")
            params.append(payload["node_type"])

        if not set_clauses:
            raise ValueError("No valid fields provided for update")

        set_clauses.append("updated_at = ?")
        params.append(datetime.utcnow().isoformat())

        params.append(node_id)
        params.append(user_id)

        cursor.execute(
            f"""
            UPDATE data_flow_nodes
            SET {', '.join(set_clauses)}
            WHERE id = ? AND user_id = ?
            """,
            params,
        )

        if cursor.rowcount == 0:
            raise ValueError("Node not found")

        updated = get_data_flow_node(user_id, node_id, conn=conn)

        _record_audit(
            conn,
            user_id=user_id,
            action="update_node",
            target_type="node",
            target_id=node_id,
            before_state=existing,
            after_state=updated,
            performed_by=performed_by,
        )
        conn.commit()
        return updated
    finally:
        conn.close()


def delete_data_flow_node(user_id: int, node_id: int, performed_by: int, reason: Optional[str] = None) -> None:
    conn = get_db()
    try:
        existing = get_data_flow_node(user_id, node_id, conn=conn)
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM data_flow_nodes WHERE id = ? AND user_id = ?",
            (node_id, user_id),
        )
        if cursor.rowcount == 0:
            raise ValueError("Node not found")

        _record_audit(
            conn,
            user_id=user_id,
            action="delete_node",
            target_type="node",
            target_id=node_id,
            before_state=existing,
            after_state=None,
            performed_by=performed_by,
            reason=reason,
        )
        conn.commit()
    finally:
        conn.close()


def create_data_flow_edge(user_id: int, payload: Dict[str, Any], performed_by: int) -> Dict[str, Any]:
    required_fields = {"source_node_id", "target_node_id", "flow_type"}
    if not required_fields.issubset(payload.keys()):
        raise ValueError("source_node_id, target_node_id, and flow_type are required")

    conn = get_db()
    try:
        cursor = conn.cursor()

        # Ensure nodes belong to user
        cursor.execute(
            "SELECT id FROM data_flow_nodes WHERE id = ? AND user_id = ?",
            (payload["source_node_id"], user_id),
        )
        if not cursor.fetchone():
            raise ValueError("Source node not found or not accessible")

        cursor.execute(
            "SELECT id FROM data_flow_nodes WHERE id = ? AND user_id = ?",
            (payload["target_node_id"], user_id),
        )
        if not cursor.fetchone():
            raise ValueError("Target node not found or not accessible")

        now = datetime.utcnow().isoformat()
        cursor.execute(
            """
            INSERT INTO data_flow_edges
            (user_id, source_node_id, target_node_id, flow_type, transport,
             encryption_status, retention_policy, latency, volume, status,
             automated, controls_impacted, metadata_json, last_validated_at,
             created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                payload["source_node_id"],
                payload["target_node_id"],
                payload["flow_type"],
                payload.get("transport"),
                payload.get("encryption_status"),
                payload.get("retention_policy"),
                payload.get("latency"),
                payload.get("volume"),
                payload.get("status", "active"),
                int(payload.get("automated", True)),
                _json_dumps(payload.get("controls_impacted")),
                _json_dumps(payload.get("metadata")),
                payload.get("last_validated_at"),
                now,
                now,
            ),
        )

        edge_id = cursor.lastrowid
        edge = get_data_flow_edge(user_id, edge_id, conn=conn)

        _record_audit(
            conn,
            user_id=user_id,
            action="create_edge",
            target_type="edge",
            target_id=edge_id,
            before_state=None,
            after_state=edge,
            performed_by=performed_by,
        )
        conn.commit()
        return edge
    finally:
        conn.close()


def update_data_flow_edge(user_id: int, edge_id: int, payload: Dict[str, Any], performed_by: int) -> Dict[str, Any]:
    if not payload:
        raise ValueError("No updates provided")

    conn = get_db()
    try:
        existing = get_data_flow_edge(user_id, edge_id, conn=conn)
        cursor = conn.cursor()

        set_clauses = []
        params: List[Any] = []

        mapping = {
            "flow_type": "flow_type",
            "transport": "transport",
            "encryption_status": "encryption_status",
            "retention_policy": "retention_policy",
            "latency": "latency",
            "volume": "volume",
            "status": "status",
            "last_validated_at": "last_validated_at",
        }

        for field, column in mapping.items():
            if field in payload:
                set_clauses.append(f"{column} = ?")
                params.append(payload[field])

        json_mapping = {
            "controls_impacted": "controls_impacted",
            "metadata": "metadata_json",
        }

        for field, column in json_mapping.items():
            if field in payload:
                set_clauses.append(f"{column} = ?")
                params.append(_json_dumps(payload[field]))

        if "automated" in payload:
            set_clauses.append("automated = ?")
            params.append(int(bool(payload["automated"])))

        if "source_node_id" in payload or "target_node_id" in payload:
            raise ValueError("Updating source or target node is not supported; recreate the edge instead")

        if not set_clauses:
            raise ValueError("No valid fields provided for update")

        set_clauses.append("updated_at = ?")
        params.append(datetime.utcnow().isoformat())
        params.append(edge_id)
        params.append(user_id)

        cursor.execute(
            f"""
            UPDATE data_flow_edges
            SET {', '.join(set_clauses)}
            WHERE id = ? AND user_id = ?
            """,
            params,
        )

        if cursor.rowcount == 0:
            raise ValueError("Edge not found")

        updated = get_data_flow_edge(user_id, edge_id, conn=conn)

        _record_audit(
            conn,
            user_id=user_id,
            action="update_edge",
            target_type="edge",
            target_id=edge_id,
            before_state=existing,
            after_state=updated,
            performed_by=performed_by,
        )
        conn.commit()
        return updated
    finally:
        conn.close()


def delete_data_flow_edge(user_id: int, edge_id: int, performed_by: int, reason: Optional[str] = None) -> None:
    conn = get_db()
    try:
        existing = get_data_flow_edge(user_id, edge_id, conn=conn)
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM data_flow_edges WHERE id = ? AND user_id = ?",
            (edge_id, user_id),
        )
        if cursor.rowcount == 0:
            raise ValueError("Edge not found")

        _record_audit(
            conn,
            user_id=user_id,
            action="delete_edge",
            target_type="edge",
            target_id=edge_id,
            before_state=existing,
            after_state=None,
            performed_by=performed_by,
            reason=reason,
        )
        conn.commit()
    finally:
        conn.close()


