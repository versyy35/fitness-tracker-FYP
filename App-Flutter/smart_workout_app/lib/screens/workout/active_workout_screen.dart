import 'package:flutter/material.dart';

class ActiveWorkoutScreen extends StatelessWidget {
  const ActiveWorkoutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Active Workout')),
      body: const Center(child: Text('Active Workout Screen')),
    );
  }
}