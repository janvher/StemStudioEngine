import {Position, Node} from "reactflow";
/**
 *
 * @param intersectionNode
 * @param targetNode
 */
export function getNodeIntersection(intersectionNode: Node, targetNode: Node) {
    const intersectionNodeWidth = intersectionNode.width || 150;
    const intersectionNodeHeight = intersectionNode.height || 50;
    const intersectionNodePosition = intersectionNode.position;
    const targetPosition = targetNode.position;

    const sourceCenter = {
        x: intersectionNodePosition.x + intersectionNodeWidth / 2,
        y: intersectionNodePosition.y + intersectionNodeHeight / 2,
    };
    const targetCenter = {
        x: targetPosition.x + (targetNode.width || 150) / 2,
        y: targetPosition.y + (targetNode.height || 50) / 2,
    };

    const angle = Math.atan2(targetCenter.y - sourceCenter.y, targetCenter.x - sourceCenter.x);

    const halfWidth = intersectionNodeWidth / 2;
    const halfHeight = intersectionNodeHeight / 2;

    let x, y;
    const tan = Math.tan(angle);
    const cot = 1 / tan;

    if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
        x = sourceCenter.x + (Math.cos(angle) > 0 ? halfWidth : -halfWidth);
        y = sourceCenter.y + tan * (x - sourceCenter.x);
    } else {
        y = sourceCenter.y + (Math.sin(angle) > 0 ? halfHeight : -halfHeight);
        x = sourceCenter.x + (y - sourceCenter.y) * cot;
    }

    x = Math.max(intersectionNodePosition.x, Math.min(x, intersectionNodePosition.x + intersectionNodeWidth));
    y = Math.max(intersectionNodePosition.y, Math.min(y, intersectionNodePosition.y + intersectionNodeHeight));

    return {x, y};
}

/**
 *
 * @param node
 * @param intersectionPoint
 * @param intersectionPoint.x
 * @param intersectionPoint.y
 */
export function getEdgePosition(node: Node, intersectionPoint: {x: number; y: number}) {
    const nodeWidth = node.width || 150;
    const nodeHeight = node.height || 50;
    const nodeCenter = {
        x: node.position.x + nodeWidth / 2,
        y: node.position.y + nodeHeight / 2,
    };

    const angle = Math.atan2(intersectionPoint.y - nodeCenter.y, intersectionPoint.x - nodeCenter.x);

    const degrees = angle * 180 / Math.PI;

    if (degrees >= -45 && degrees < 45) {
        return Position.Right;
    } else if (degrees >= 45 && degrees < 135) {
        return Position.Bottom;
    } else if (degrees >= 135 || degrees < -135) {
        return Position.Left;
    } else {
        return Position.Top;
    }
}

/**
 *
 * @param source
 * @param target
 */
export function getEdgeParams(source: Node, target: Node) {
    const sourceIntersectionPoint = getNodeIntersection(source, target);
    const targetIntersectionPoint = getNodeIntersection(target, source);

    const sourcePos = getEdgePosition(source, sourceIntersectionPoint);
    const targetPos = getEdgePosition(target, targetIntersectionPoint);

    return {
        sx: sourceIntersectionPoint.x,
        sy: sourceIntersectionPoint.y,
        tx: targetIntersectionPoint.x,
        ty: targetIntersectionPoint.y,
        sourcePos,
        targetPos,
    };
}
