import AttributeWidget from "./AttributeWidget";
import {BehaviorAttribute, GroupAttribute} from "../BehaviorAttributes";
import BehaviorAttributeType from "../BehaviorAttributeType";
import ArrayAttributeWidget from "./ArrayAttributeWidget";
import GroupWidget from "./GroupWidget";

class WidgetFactory {
    private widgetRegistry: Map<BehaviorAttributeType, AttributeWidget>;

    constructor(widgetRegistry: Map<BehaviorAttributeType, AttributeWidget>) {
        this.widgetRegistry = widgetRegistry;
    }

    createWidget(attribute: BehaviorAttribute): AttributeWidget | null {
        let widget: AttributeWidget | null = null;

        if (attribute.array) {
            const innerWidget = this.getBaseWidget(attribute);
            if (!innerWidget) {
                console.error(`Widget not found for attribute type "${attribute.type}"`);
                return null;
            }
            widget = new ArrayAttributeWidget(innerWidget, attribute);
        }

        if (!widget) {
            widget = this.getBaseWidget(attribute);
        }

        if (!widget) {
            console.error(`Widget not found for attribute type "${attribute.type}"`);
            return null;
        }

        return widget;
    }

    private getBaseWidget(attribute: BehaviorAttribute): AttributeWidget | null {
        const type = attribute.type as BehaviorAttributeType;
        if (type === BehaviorAttributeType.Group) {
            // TODO: make it more generic
            return new GroupWidget(attribute as GroupAttribute, this);
        }

        return this.widgetRegistry.get(type) || null;
    }
}

export default WidgetFactory;
