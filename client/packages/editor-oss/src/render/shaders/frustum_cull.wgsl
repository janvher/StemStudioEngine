// GPU frustum culling compute shader.
// Tests bounding spheres against 6 frustum planes and writes a visibility flag
// per instance. Dispatched with ceil(instanceCount / 64) workgroups.

struct FrustumPlane {
    normal: vec3<f32>,
    distance: f32,
};

struct CullParams {
    planes: array<FrustumPlane, 6>,
    instanceCount: u32,
};

struct BoundingSphere {
    center: vec3<f32>,
    radius: f32,
};

@group(0) @binding(0) var<uniform> params: CullParams;
@group(0) @binding(1) var<storage, read> spheres: array<BoundingSphere>;
@group(0) @binding(2) var<storage, read_write> visibility: array<u32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let idx = gid.x;
    if (idx >= params.instanceCount) {
        return;
    }

    let sphere = spheres[idx];
    var visible: u32 = 1u;

    for (var i = 0u; i < 6u; i = i + 1u) {
        let plane = params.planes[i];
        let dist = dot(plane.normal, sphere.center) + plane.distance;
        if (dist < -sphere.radius) {
            visible = 0u;
            break;
        }
    }

    visibility[idx] = visible;
}
