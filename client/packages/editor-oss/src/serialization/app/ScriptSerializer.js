import BaseSerializer from "../BaseSerializer";

/**
 * ScriptSerializer
 *
 */
class ScriptSerializer extends BaseSerializer {
    toJSON(scripts) {
        var list = [];

        scripts.forEach(script => {
            var json = BaseSerializer.prototype.toJSON.call(this);

            Object.assign(json, {
                id: script.id,
                pid: script.pid,
                name: script.name,
                type: script.type,
                source: script.source,
                sort: script.sort,
                uuid: script.uuid,
                isBehaviorScript: script.isBehaviorScript,
            });

            list.push(json);
        });

        return list;
    }

    fromJSON(jsons, parent) {
        parent = parent || [];

        jsons.forEach(json => {
            parent.push({
                id: json.id,
                pid: json.pid,
                name: json.name,
                type: json.type,
                source: json.source,
                sort: json.sort,
                uuid: json.uuid,
                isBehaviorScript: !!json.isBehaviorScript,
            });
        });

        return parent;
    }
}

export default ScriptSerializer;
